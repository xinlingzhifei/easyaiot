package com.basiclab.iot.common.utils;

import org.springframework.beans.factory.ObjectProvider;

/**
 * 解析 RPC API Bean：若当前进程内存在 *ApiImpl 本地实现，则优先使用，避免 Feign 回环调用自身。
 */
public final class RpcApiBeanUtils {

    private RpcApiBeanUtils() {
    }

    public static <T> T resolveLocalApi(ObjectProvider<T> provider) {
        return provider.orderedStream()
                .filter(api -> api.getClass().getSimpleName().endsWith("ApiImpl"))
                .findFirst()
                .orElseGet(provider::getObject);
    }

}
