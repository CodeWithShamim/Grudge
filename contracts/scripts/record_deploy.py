#!/usr/bin/env python3
"""Record a `genlayer deploy` result: write the contract address to
contracts/deployments.json and apps/web/.env.local."""

from __future__ import annotations

import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOYMENTS = ROOT / "contracts" / "deployments.json"
ENV_LOCAL = ROOT / "apps" / "web" / ".env.local"


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: record_deploy.py <deploy.log>", file=sys.stderr)
        return 2
    log = Path(sys.argv[1]).read_text()
    match = re.search(r"0x[0-9a-fA-F]{40}", log)
    if not match:
        print("no contract address found in deploy output", file=sys.stderr)
        return 1
    address = match.group(0)

    records = json.loads(DEPLOYMENTS.read_text()) if DEPLOYMENTS.exists() else []
    records.append(
        {
            "contract": "grudge.py",
            "network": "testnet-bradbury",
            "address": address,
            "deployedAt": datetime.datetime.now(datetime.UTC).isoformat(),
        }
    )
    DEPLOYMENTS.write_text(json.dumps(records, indent=2, sort_keys=True) + "\n")

    lines = ENV_LOCAL.read_text().splitlines() if ENV_LOCAL.exists() else []
    lines = [line for line in lines if not line.startswith("NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS=")]
    lines.append(f"NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS={address}")
    ENV_LOCAL.write_text("\n".join(lines) + "\n")

    print(f"recorded {address} -> deployments.json + apps/web/.env.local")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
