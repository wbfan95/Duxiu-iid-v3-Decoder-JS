from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


DEFAULT_CODEBOOK_DIR = Path("codebook")
DEFAULT_TEMPLATE = Path("userscript.template.js")
DEFAULT_OUTPUT = Path("duxiu-iid-v3-decoder.user.js")
PAYLOAD_PLACEHOLDER = "__PAYLOAD_JSON__"


def load_selector_arrays(path: Path) -> tuple[list[str], dict[str, list[str]]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        slots = header[1:]
        arrays: dict[str, list[str]] = {slot: [] for slot in slots}
        for row in reader:
            for slot, value in zip(slots, row[1:]):
                arrays[slot].append(value.strip().lower())
    return slots, arrays


def load_144_alias_compact(path: Path) -> dict[str, str]:
    alias: dict[str, str] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            short_key = str(row.get("short_key", "")).strip().lower()
            slot128 = str(row.get("slot128", "")).strip().lower()
            if short_key and slot128:
                alias[short_key] = slot128
    return alias


def build_payload(codebook_dir: Path) -> dict[str, Any]:
    slots3, code3 = load_selector_arrays(codebook_dir / "3digit_selector6_codebook.tsv")
    slots2, code2 = load_selector_arrays(codebook_dir / "2digit_selector5_codebook.tsv")
    if slots3 != slots2:
        raise SystemExit("128 3digit/2digit slot orders differ.")

    return {
        "code128": {
            "slots": slots3,
            "code3": code3,
            "code2": code2,
        },
        "alias144": {
            "slice_start": 54,
            "slice_end": 56,
            "short_to_slot128": load_144_alias_compact(codebook_dir / "144_slot_alias_compact.tsv"),
        },
    }


def render_userscript(payload: dict[str, Any], template_path: Path) -> str:
    template = template_path.read_text(encoding="utf-8")
    if PAYLOAD_PLACEHOLDER not in template:
        raise SystemExit(f"Template is missing {PAYLOAD_PLACEHOLDER}.")

    payload_json = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))
    return template.replace(PAYLOAD_PLACEHOLDER, payload_json, 1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a DuXiu iid v3 decoder userscript.")
    parser.add_argument("--codebook-dir", type=Path, default=DEFAULT_CODEBOOK_DIR)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    payload = build_payload(args.codebook_dir)
    args.output.write_text(render_userscript(payload, args.template), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "template": str(args.template),
                "alias144_short": payload["alias144"]["short_to_slot128"],
                "alias144_slice": [
                    payload["alias144"]["slice_start"],
                    payload["alias144"]["slice_end"],
                ],
            },
            ensure_ascii=True,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
