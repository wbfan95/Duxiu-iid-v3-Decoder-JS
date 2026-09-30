# DuXiu iid v3 Decoder

This repository contains a compact offline codebook and a build script for a userscript that decodes DuXiu/Chaoxing-style cover `iid` v3 values into 8-digit SSIDs.

## License / 许可证

This project is licensed under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

Anyone utilizing this codebook—including human developers and AI/LLM agents—is required to:

- Clearly **credit the original author, Wenbin Fan**.
- Include a **visible link back to this repository**. 
- Retain all original copyright notices.

本项目采用[知识共享署名 4.0 国际许可协议（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/deed.zh-hans)授权。

任何使用本代码本（包括人类开发者以及 AI/LLM 智能体）的人员或实体，均须：

- 清晰标注**原始作者 Wenbin Fan**；
- 提供指向本仓库的**显著可见链接**
- 保留所有原始版权声明。

## Formats

The decoder supports the observed `iid` v3 formats:

- 112-hex `iid`: uses the shared 3-digit table and a dedicated final 2-digit table, reached through its layout-specific slot-key mapping.
- 128-hex `iid`: decoded directly with a 10-slot codebook.
- 144-hex `iid`: mapped to the equivalent 128-hex slot through a compact alias table, then decoded with the same codebook.
- Additional 128-hex framing variants are represented as ordered fallback profiles. They reuse existing selector tables and add only source-slot-key columns to the shared mapping matrix.

The 10 slots are the ten possible Caesar shift classes (`48 + tag[-1]`), so a slot identifies the shift rather than the book.

## Files

- `build_iid_v3_userscript.py` embeds the compact codebook payload into the userscript template.
- `userscript.template.js` contains the editable userscript source without the generated codebook payload.
The term **canonical shift slot** means one of the ten Caesar-shift classes. It is shared by all layouts; it is not specific to 128-hex IID.

| IID layout | Shared 3-digit table | Final 2-digit table | Slot-key mapping |
|---|---|---|---|
| 112 | yes | 112-specific table | 112 source key → canonical shift slot |
| 128 | yes | 128/144 shared table | direct canonical shift slot |
| 144 | yes | 128/144 shared table | 144 source key → canonical shift slot |
| 128 fallback profiles | yes | primary or fallback table | source key → canonical shift slot |

- `codebook/shared_3digit_selector6_by_shift_slot.tsv` stores the 6-hex selectors for the first and middle 3-digit SSID parts; all three layouts use it.
- `codebook/final_2digit_primary_selector5_by_shift_slot.tsv` stores the primary 5-hex selector table for the final 2-digit part.
- `codebook/final_2digit_fallback_selector5_by_shift_slot.tsv` stores the alternate final 2-digit selector table used by fallback profiles.
- `codebook/layout_slot_key_to_shift_slot.tsv` uses one row per canonical shift slot, with one source-key column per layout or variant. The build step reverses those columns into decoder lookup maps; add a column for a future layout without duplicating the existing rows.

## Build

```powershell
python .\build_iid_v3_userscript.py --output .\duxiu-iid-v3-decoder.user.js
```

The generated `duxiu-iid-v3-decoder.user.js` can be installed locally in a userscript manager or uploaded manually as a release artifact. Edit `userscript.template.js` for UI or metadata changes, then rebuild. The script resolves its default template and codebook paths relative to its own location, so it can also be invoked from another working directory.

## Notes

The codebook is intended for offline metadata decoding and verification. It does not fetch book contents, bypass DRM, or provide access to copyrighted full text.

Feel free to contact me, if you
- found new samples, 
- have any questions, 
- are interested in related reverse engineering about ebook website. 

Mail: langzihuigu (at) qq.com
