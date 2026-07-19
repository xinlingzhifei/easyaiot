#!/usr/bin/env python3
"""零依赖 Modbus TCP 从站模拟器（FC01/03/05/06），供本地联调上行采集与下行写入。"""

from __future__ import annotations

import argparse
import socket
import struct
import threading
from typing import List


class ModbusTcpSlave:
    def __init__(self, unit_id: int = 1):
        self.unit_id = unit_id
        self.holding = [25, 20, 0, 0, 0, 0, 0, 0, 0, 0]  # temperature=25, setpoint=20
        self.coils = [False] * 16

    def handle(self, request: bytes) -> bytes:
        if len(request) < 8:
            return b""
        transaction_id, protocol_id, length, unit = struct.unpack(">HHHB", request[:7])
        if protocol_id != 0 or unit != self.unit_id:
            return b""
        pdu = request[7 : 6 + length]
        if not pdu:
            return b""
        function = pdu[0]
        try:
            if function == 0x03:
                address, quantity = struct.unpack(">HH", pdu[1:5])
                values = self.holding[address : address + quantity]
                if len(values) != quantity:
                    raise ValueError("address out of range")
                body = struct.pack(">BB", 0x03, quantity * 2) + struct.pack(f">{quantity}H", *values)
            elif function == 0x01:
                address, quantity = struct.unpack(">HH", pdu[1:5])
                bits = self.coils[address : address + quantity]
                if len(bits) != quantity:
                    raise ValueError("address out of range")
                byte_count = (quantity + 7) // 8
                packed = bytearray(byte_count)
                for index, bit in enumerate(bits):
                    if bit:
                        packed[index // 8] |= 1 << (index % 8)
                body = bytes([0x01, byte_count]) + bytes(packed)
            elif function == 0x06:
                address, value = struct.unpack(">HH", pdu[1:5])
                self.holding[address] = value
                print(f"[WRITE REG] addr={address} value={value}")
                body = pdu
            elif function == 0x05:
                address, raw = struct.unpack(">HH", pdu[1:5])
                self.coils[address] = raw == 0xFF00
                print(f"[WRITE COIL] addr={address} value={self.coils[address]}")
                body = pdu
            else:
                body = bytes([function | 0x80, 0x01])
        except Exception:
            body = bytes([function | 0x80, 0x02])
        return struct.pack(">HHHB", transaction_id, 0, len(body) + 1, unit) + body


def serve_client(conn: socket.socket, slave: ModbusTcpSlave) -> None:
    with conn:
        while True:
            header = conn.recv(7)
            if not header or len(header) < 7:
                return
            _, _, length, _ = struct.unpack(">HHHB", header)
            rest = b""
            while len(rest) < length - 1:
                chunk = conn.recv(length - 1 - len(rest))
                if not chunk:
                    return
                rest += chunk
            response = slave.handle(header + rest)
            if response:
                conn.sendall(response)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Modbus TCP slave simulator")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5020, help="默认 5020，避免需要 root 监听 502")
    parser.add_argument("--unit", type=int, default=1)
    args = parser.parse_args()
    slave = ModbusTcpSlave(args.unit)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((args.host, args.port))
        server.listen(8)
        print(f"Modbus TCP slave listening on {args.host}:{args.port}, unit={args.unit}")
        print("holding[0]=temperature=25, holding[1]=setpoint=20, coil[0]=running")
        while True:
            conn, addr = server.accept()
            print(f"client connected: {addr}")
            threading.Thread(target=serve_client, args=(conn, slave), daemon=True).start()


if __name__ == "__main__":
    main()
