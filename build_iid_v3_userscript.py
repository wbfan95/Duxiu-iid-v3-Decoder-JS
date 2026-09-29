from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_CODEBOOK_DIR = PROJECT_DIR / "codebook"
DEFAULT_TEMPLATE = PROJECT_DIR / "userscript.template.js"
DEFAULT_OUTPUT = PROJECT_DIR / "duxiu-iid-v3-decoder.user.js"
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


def load_slot_key_maps(path: Path) -> dict[int, dict[str, str]]:
    """Read the human-facing matrix and reverse it into decoder lookup maps."""
    mappings: dict[int, dict[str, str]] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            canonical_shift_slot = str(row.get("canonical_shift_slot", "")).strip().lower()
            if not canonical_shift_slot:
                continue
            for field, source_slot_key in row.items():
                match = re.fullmatch(r"v3_(\d+)_slot_key", field or "")
                source_slot_key = str(source_slot_key or "").strip().lower()
                if match and source_slot_key:
                    mappings.setdefault(int(match.group(1)), {})[source_slot_key] = canonical_shift_slot
    return mappings


def build_payload(codebook_dir: Path) -> dict[str, Any]:
    slots3, code3 = load_selector_arrays(codebook_dir / "shared_3digit_selector6_by_shift_slot.tsv")
    slots2, code2 = load_selector_arrays(codebook_dir / "v3_128_144_2digit_selector5_by_shift_slot.tsv")
    if slots3 != slots2:
        raise SystemExit("128 3digit/2digit slot orders differ.")
    slots112, code2_112 = load_selector_arrays(codebook_dir / "v3_112_2digit_selector5_by_shift_slot.tsv")
    if slots112 != slots2:
        raise SystemExit("112 2digit slot order differs from the 128 slot order.")

    slot_key_maps = load_slot_key_maps(codebook_dir / "layout_slot_key_to_shift_slot.tsv")
    return {
        "shared": {
            "slots": slots3,
            "code3": code3,
            "code2": code2,
        },
        "layout144": {
            "slot_key_slice_start": 54,
            "slot_key_slice_end": 56,
            "slot_key_to_shift_slot": slot_key_maps[144],
        },
        # 112-hex shares the first two 3-digit blocks with 128, but uses its
        # own final 2-digit selector table.
        "layout112": {
            "slot_key_slice_start": 48,
            "slot_key_slice_end": 50,
            "slot_key_to_shift_slot": slot_key_maps[112],
            "slots": slots112,
            "code2": code2_112,
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
                "v3_144_slot_key_to_canonical_shift_slot": payload["layout144"]["slot_key_to_shift_slot"],
                "v3_144_slot_key_slice": [
                    payload["layout144"]["slot_key_slice_start"],
                    payload["layout144"]["slot_key_slice_end"],
                ],
                "v3_112_slot_key_to_canonical_shift_slot": payload["layout112"]["slot_key_to_shift_slot"],
                "v3_112_slot_key_slice": [
                    payload["layout112"]["slot_key_slice_start"],
                    payload["layout112"]["slot_key_slice_end"],
                ],
            },
            ensure_ascii=True,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
