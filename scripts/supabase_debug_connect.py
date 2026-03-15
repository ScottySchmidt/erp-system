#!/usr/bin/env python3
"""
Very verbose Supabase connection diagnostic script.

Usage:
  python scripts/supabase_debug_connect.py
  python scripts/supabase_debug_connect.py --table invoices --limit 3 --timeout 15

Expected environment variables:
  SUPABASE_URL
  SUPABASE_KEY (or SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)
"""

from __future__ import annotations

import argparse
import os
import platform
import socket
import sys
import traceback
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def mask_secret(secret: str | None, visible: int = 6) -> str:
    if not secret:
        return "<missing>"
    if len(secret) <= visible:
        return "*" * len(secret)
    return f"{secret[:visible]}...({len(secret)} chars)"


def print_header() -> None:
    print("=" * 70)
    print("SUPABASE CONNECTION DEBUGGER")
    print("=" * 70)
    print(f"[INFO] UTC time: {datetime.now(timezone.utc).isoformat()}")
    print(f"[INFO] Python:   {platform.python_version()}")
    print(f"[INFO] Platform: {platform.platform()}")
    print("=" * 70)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Diagnose why Supabase is not connecting."
    )
    parser.add_argument(
        "--table",
        default="invoices",
        help="Table name to query for connection check (default: invoices).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1,
        help="Row limit for test query (default: 1).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="HTTP timeout in seconds (default: 10).",
    )
    return parser.parse_args()


def load_credentials() -> tuple[str | None, str | None]:
    print("[STEP] Reading environment variables...")
    url = os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    print(f"[INFO] SUPABASE_URL present: {'yes' if url else 'no'}")
    print(
        "[INFO] SUPABASE_KEY/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY present: "
        f"{'yes' if key else 'no'}"
    )
    print(f"[INFO] Key preview: {mask_secret(key)}")
    return url, key


def validate_url(url: str) -> str | None:
    print("[STEP] Validating SUPABASE_URL format...")
    parsed = urlparse(url)
    print(f"[INFO] Parsed URL: scheme={parsed.scheme}, netloc={parsed.netloc}")

    if parsed.scheme not in {"http", "https"}:
        print(
            "[ERROR] SUPABASE_URL must start with http:// or https:// "
            f"(got scheme='{parsed.scheme}')"
        )
        return None

    if not parsed.netloc:
        print("[ERROR] SUPABASE_URL is missing a hostname.")
        return None

    host = parsed.hostname
    if not host:
        print("[ERROR] Could not determine host from SUPABASE_URL.")
        return None

    print(f"[OK] URL appears valid. Host resolved for next checks: {host}")
    return host


def check_dns(host: str) -> bool:
    print(f"[STEP] Checking DNS lookup for host '{host}'...")
    try:
        addresses = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
        unique = sorted({addr[4][0] for addr in addresses})
        print(f"[OK] DNS lookup succeeded. IPs: {', '.join(unique[:5])}")
        if len(unique) > 5:
            print(f"[INFO] ...and {len(unique) - 5} more IP(s)")
        return True
    except Exception as exc:
        print("[ERROR] DNS lookup failed.")
        print(f"[ERROR] Exception type: {type(exc).__name__}")
        print(f"[ERROR] Exception text: {exc}")
        print("[TRACEBACK]")
        traceback.print_exc()
        return False


def check_rest_endpoint(url: str, key: str, timeout: int) -> bool:
    rest_root = f"{url.rstrip('/')}/rest/v1/"
    print(f"[STEP] Probing Supabase REST endpoint: {rest_root}")
    request = Request(
        rest_root,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read(400).decode("utf-8", errors="replace")
            print(f"[OK] REST endpoint responded with HTTP {response.status}")
            print(f"[INFO] Response snippet: {body}")
            return True
    except HTTPError as exc:
        try:
            body = exc.read(400).decode("utf-8", errors="replace")
        except Exception:
            body = "<unable to decode error body>"
        print(f"[ERROR] REST endpoint returned HTTP {exc.code}")
        print(f"[ERROR] HTTPError reason: {exc.reason}")
        print(f"[ERROR] Error response snippet: {body}")
        return False
    except URLError as exc:
        print("[ERROR] URL/network error while calling REST endpoint.")
        print(f"[ERROR] URLError reason: {exc.reason}")
        print("[TRACEBACK]")
        traceback.print_exc()
        return False
    except Exception as exc:
        print("[ERROR] Unexpected exception while calling REST endpoint.")
        print(f"[ERROR] Exception type: {type(exc).__name__}")
        print(f"[ERROR] Exception text: {exc}")
        print("[TRACEBACK]")
        traceback.print_exc()
        return False


def check_python_client(url: str, key: str, table: str, limit: int) -> bool:
    print("[STEP] Importing supabase Python package...")
    try:
        from supabase import create_client  # type: ignore
    except Exception as exc:
        print("[ERROR] Could not import supabase package.")
        print(f"[ERROR] Exception type: {type(exc).__name__}")
        print(f"[ERROR] Exception text: {exc}")
        print("[HINT] Install it with: pip install supabase")
        print("[TRACEBACK]")
        traceback.print_exc()
        return False

    print("[STEP] Creating Supabase client...")
    try:
        client = create_client(url, key)
        print("[OK] Supabase client created.")
    except Exception as exc:
        print("[ERROR] Failed to create Supabase client.")
        print(f"[ERROR] Exception type: {type(exc).__name__}")
        print(f"[ERROR] Exception text: {exc}")
        print("[TRACEBACK]")
        traceback.print_exc()
        return False

    print(f"[STEP] Running test query: table='{table}', limit={limit}")
    try:
        result = client.table(table).select("*").limit(limit).execute()
        data = getattr(result, "data", None)
        print("[OK] Query executed without raising an exception.")
        if isinstance(data, list):
            print(f"[INFO] Returned row count: {len(data)}")
            preview = data[:1]
            print(f"[INFO] First row preview: {preview}")
        else:
            print(f"[INFO] Result data type: {type(data).__name__}")
            print(f"[INFO] Result data preview: {data}")
        return True
    except Exception as exc:
        print("[ERROR] Query failed.")
        print(f"[ERROR] Exception type: {type(exc).__name__}")
        print(f"[ERROR] Exception text: {exc}")
        print(
            "[HINT] If this says relation/table does not exist, "
            "connection may still be working; check table name or schema."
        )
        print(
            "[HINT] If this says permission denied, check RLS policies and which key "
            "you are using."
        )
        print("[TRACEBACK]")
        traceback.print_exc()
        return False


def main() -> int:
    print_header()
    args = parse_args()

    url, key = load_credentials()
    if not url or not key:
        print("[FATAL] Missing required credentials.")
        print("[FATAL] Required: SUPABASE_URL and one of SUPABASE_KEY/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY")
        return 1

    host = validate_url(url)
    if not host:
        print("[FATAL] Invalid SUPABASE_URL.")
        return 1

    dns_ok = check_dns(host)
    http_ok = check_rest_endpoint(url, key, args.timeout)
    client_ok = check_python_client(url, key, args.table, args.limit)

    print("=" * 70)
    print("[SUMMARY]")
    print(f"DNS lookup:          {'PASS' if dns_ok else 'FAIL'}")
    print(f"REST endpoint check: {'PASS' if http_ok else 'FAIL'}")
    print(f"Python client query: {'PASS' if client_ok else 'FAIL'}")
    print("=" * 70)

    if dns_ok and http_ok and client_ok:
        print("[DONE] Supabase connectivity checks passed.")
        return 0

    print("[DONE] One or more checks failed. Review errors above.")
    return 2


if __name__ == "__main__":
    sys.exit(main())
