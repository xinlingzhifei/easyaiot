from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Iterable

import httpx

from .models import Credential

DEVICE_INFO_PATH = "/ISAPI/System/deviceInfo"
_ISAPI_USER_AGENT = "hiktools/0.1"


@dataclass
class IsapiResult:
    status: int | None
    body: str | None
    www_authenticate: str | None
    server: str | None
    used_credential: Credential | None
    error: str | None = None


def _fetch_isapi_path_sync_requests(
    base_url: str,
    path: str,
    credentials: Iterable[Credential],
    timeout: float,
) -> IsapiResult:
    """requests + HTTPDigestAuth 兜底（部分海康固件与 httpx Digest 不兼容）。"""
    import requests
    from requests.auth import HTTPDigestAuth

    url = f"{base_url.rstrip('/')}{path}"
    headers = {"User-Agent": _ISAPI_USER_AGENT}
    cred_list = list(credentials)

    try:
        r = requests.get(url, timeout=timeout, verify=False, headers=headers)
    except requests.RequestException as e:
        return IsapiResult(None, None, None, None, None, error=str(e))

    challenge = r.headers.get("WWW-Authenticate")
    server = r.headers.get("Server")

    if r.status_code == 200:
        return IsapiResult(200, r.text, challenge, server, None)

    if r.status_code != 401:
        return IsapiResult(r.status_code, r.text, challenge, server, None)

    last = IsapiResult(r.status_code, r.text, challenge, server, None)
    for cred in cred_list:
        try:
            ra = requests.get(
                url,
                auth=HTTPDigestAuth(cred.username, cred.password),
                timeout=timeout,
                verify=False,
                headers=headers,
            )
        except requests.RequestException as e:
            last = IsapiResult(None, None, challenge, server, cred, error=str(e))
            continue
        if ra.status_code == 200:
            return IsapiResult(
                200,
                ra.text,
                ra.headers.get("WWW-Authenticate") or challenge,
                ra.headers.get("Server") or server,
                cred,
            )
        last = IsapiResult(
            ra.status_code,
            ra.text,
            ra.headers.get("WWW-Authenticate") or challenge,
            ra.headers.get("Server") or server,
            cred,
        )
    return last


async def fetch_isapi_path(
    client: httpx.AsyncClient,
    base_url: str,
    path: str,
    credentials: Iterable[Credential] = (),
    timeout: float = 5.0,
) -> IsapiResult:
    """GET an ISAPI path; tries Digest auth with each credential after 401."""
    url = f"{base_url.rstrip('/')}{path}"

    try:
        r = await client.get(url, timeout=timeout)
    except (httpx.TimeoutException, httpx.TransportError) as e:
        return IsapiResult(None, None, None, None, None, error=str(e))

    challenge = r.headers.get("WWW-Authenticate")
    server = r.headers.get("Server")
    last = IsapiResult(r.status_code, r.text, challenge, server, None)

    if r.status_code != 401:
        if r.status_code == 200:
            return last
        # 非 401 失败也尝试 requests 兜底
        if credentials:
            fb = await asyncio.to_thread(
                _fetch_isapi_path_sync_requests,
                base_url,
                path,
                credentials,
                timeout,
            )
            if fb.status == 200:
                return fb
        return last

    for cred in credentials:
        try:
            ra = await client.get(
                url,
                auth=httpx.DigestAuth(cred.username, cred.password),
                timeout=timeout,
            )
        except (httpx.TimeoutException, httpx.TransportError) as e:
            last = IsapiResult(None, None, challenge, server, cred, error=str(e))
            continue

        if ra.status_code == 200:
            return IsapiResult(
                ra.status_code,
                ra.text,
                challenge,
                ra.headers.get("Server") or server,
                cred,
            )
        last = IsapiResult(
            ra.status_code,
            ra.text,
            ra.headers.get("WWW-Authenticate") or challenge,
            ra.headers.get("Server") or server,
            cred,
        )

    # httpx Digest 与海康部分固件不兼容，401 时 requests 兜底
    if credentials:
        fb = await asyncio.to_thread(
            _fetch_isapi_path_sync_requests,
            base_url,
            path,
            credentials,
            timeout,
        )
        if fb.status == 200 or (last.status == 401 and fb.status not in (None, 401)):
            return fb

    return last


async def fetch_device_info(
    client: httpx.AsyncClient,
    base_url: str,
    credentials: Iterable[Credential] = (),
    timeout: float = 5.0,
) -> IsapiResult:
    """Query /ISAPI/System/deviceInfo."""
    return await fetch_isapi_path(
        client, base_url, DEVICE_INFO_PATH, credentials, timeout
    )
