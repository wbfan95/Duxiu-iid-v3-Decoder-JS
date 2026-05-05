# DuXiu iid v3 Decoder

This repository contains a compact offline codebook and a build script for a userscript that decodes DuXiu/Chaoxing-style cover `iid` v3 values into 8-digit SSIDs.

The decoder supports the observed `iid` v3 formats:

- 128-hex `iid`: decoded directly with a 10-slot codebook.
- 144-hex `iid`: mapped to the equivalent 128-hex slot through a compact alias table, then decoded with the same codebook.

## Files

- `build_iid_v3_userscript.py` embeds the compact codebook payload into the userscript template.
- `userscript.template.js` contains the editable userscript source without the generated codebook payload.
- `codebook/3digit_selector6_codebook.tsv` stores the 6-hex selectors for the first and middle 3-digit SSID parts.
- `codebook/2digit_selector5_codebook.tsv` stores the 5-hex selectors for the final 2-digit SSID part.
- `codebook/144_slot_alias_compact.tsv` maps compact 144-hex slot keys to the 128-hex slot names.

## Build

```powershell
python .\build_iid_v3_userscript.py --output .\duxiu-iid-v3-decoder.user.js
```

The generated `duxiu-iid-v3-decoder.user.js` can be installed locally in a userscript manager or uploaded manually as a release artifact. Edit `userscript.template.js` for UI or metadata changes, then rebuild.

## Notes

The codebook is intended for offline metadata decoding and verification. It does not fetch book contents, bypass DRM, or provide access to copyrighted full text.
