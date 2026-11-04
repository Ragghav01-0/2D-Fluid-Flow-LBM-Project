"""Wire formats shared by worker, server and tests.

Worker -> server pipe: repeated [kind:u8][length:u32 LE][payload].
  kind 0 = JSON text message, kind 1 = binary frame (forwarded to the browser unchanged).
Binary frame: uint32 width, uint32 height, uint32 channels, float32 vmin, float32 vmax,
then float32 data[width*height*channels]. NaN marks solid nodes. Row 0 is the TOP of the vessel.
"""
from __future__ import annotations

import json
import struct

KIND_JSON = 0
KIND_FRAME = 1
_HEAD = struct.Struct("<BI")
_FRAME = struct.Struct("<IIIff")


def encode_msg(kind: int, payload: bytes) -> bytes:
    return _HEAD.pack(kind, len(payload)) + payload


def encode_json(obj: dict) -> bytes:
    return encode_msg(KIND_JSON, json.dumps(obj, separators=(",", ":")).encode())


def pack_frame(width: int, height: int, channels: int, vmin: float, vmax: float, data_bytes: bytes) -> bytes:
    return _FRAME.pack(width, height, channels, vmin, vmax) + data_bytes


def unpack_frame_header(buf: bytes) -> tuple[int, int, int, float, float]:
    return _FRAME.unpack_from(buf, 0)


def read_exact(stream, n: int) -> bytes | None:
    chunks = []
    while n:
        b = stream.read(n)
        if not b:
            return None
        chunks.append(b)
        n -= len(b)
    return b"".join(chunks)


def read_msg(stream) -> tuple[int, bytes] | None:
    head = read_exact(stream, _HEAD.size)
    if head is None:
        return None
    kind, length = _HEAD.unpack(head)
    payload = read_exact(stream, length) if length else b""
    return None if payload is None else (kind, payload)
