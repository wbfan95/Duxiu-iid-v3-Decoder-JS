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

Feel free to contact me, if you
- found new samples, 
- have any questions, 
- are interested in related reverse engineering about ebook website. 

Mail: langzihuigu (at) qq.com
