"""Small HTTP helpers shared by the source modules (standard library only)."""
from __future__ import annotations

import json
import urllib.request


def post_px(url: str, query: dict, user_agent: str, *, limit: int = 5_000_000) -> bytes:
    """POST a PxWeb json-stat2 query and return the validated body."""
    request = urllib.request.Request(url, data=json.dumps(query).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": user_agent})
    with urllib.request.urlopen(request, timeout=120) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} from {url}")
        body = response.read(limit + 1)
    if not body or len(body) > limit:
        raise ValueError(f"Empty or over-limit response ({len(body)} bytes): {url}")
    json.loads(body)
    return body


def get_json(url: str, user_agent: str, *, limit: int = 120_000_000, timeout: int = 180):
    request = urllib.request.Request(url, headers={"User-Agent": user_agent})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} from {url}")
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError(f"Over-limit response from {url}")
    return json.loads(body)


def jsonstat_cells(document: dict) -> list[dict]:
    """Flatten a json-stat2 cube into rows {dimension: category code, ..., 'value': v}."""
    ids, sizes = document["id"], document["size"]
    categories = []
    for dimension in ids:
        index = document["dimension"][dimension]["category"]["index"]
        categories.append(sorted(index, key=index.get) if isinstance(index, dict) else list(index))
    rows = []
    for position, value in enumerate(document["value"]):
        remainder, row = position, {}
        for dimension, size, codes in reversed(list(zip(ids, sizes, categories))):
            remainder, offset = divmod(remainder, size)
            row[dimension] = codes[offset]
        row["value"] = value
        rows.append(row)
    return rows
