// ==UserScript==
// @name         DuXiu iid v3 Decoder
// @author       Wenbin Fan
// @namespace    https://github.com/wbfan95/duxiu-iid-v3-decoder
// @version      0.3.0
// @description  Decode 112/128/144-hex DuXiu-style cover iid to SSID and show it under the cover image.
// @match        *://*.duxiu.com/*
// @match        *://*.zhizhen.com/*
// @match        *://*.chaoxing.com/*
// @match        *://*.blyun.com/*
// @match        *://*.dayi100.com/*
// @match        *://*.zhizhen.com/*
// @match        *://book.ucdrs.superlib.net/*
// @match        *://ss.liballiance.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const LABEL_CLASS = "duxiu-iid-v3-decoder-label";
  const PROCESSED_ATTR = "data-duxiu-iid-v3-processed";
  const IMAGE_URL_ATTRS = ["src", "data-src", "data-original", "original"];
  const SHOW_UNRESOLVED = true;
  const RESOLVED_TITLE = "点击复制 SSID";
  const UNRESOLVED_TEXT = "暂无 SSID";
  const UNRESOLVED_TITLE = "通常表示暂无可试读资源，或该封面暂不支持解析。如有错误，欢迎将图书页链接发送到 langzihuigu@qq.com，作者表示感谢！";

  const COVER_RULES = [
    ".divImg img[src*='iid=']",
    "#bookphoto img[src*='iid=']",
    ".save_img img[src*='iid=']",
    "img[src*='CoverNew.dll'][src*='iid=']",
  ];

  function buildInverse(values, slots, width) {
    const inverse = Object.create(null);
    for (const slot of slots) {
      const cells = Object.create(null);
      const arr = values[slot] || [];
      for (let i = 0; i < arr.length; i += 1) {
        const selector = arr[i];
        if (selector) {
          cells[selector] = String(i).padStart(width, "0");
        }
      }
      inverse[slot] = cells;
    }
    return inverse;
  }

  function buildRuntimeCodebook(raw) {
    const slots = raw.slots || [];
    return {
      slots,
      inv3: buildInverse(raw.code3, slots, 3),
      inv2: buildInverse(raw.code2, slots, 2),
    };
  }

  function injectStyle() {
    if (document.getElementById("duxiu-iid-v3-decoder-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "duxiu-iid-v3-decoder-style";
    style.textContent = `
      .${LABEL_CLASS} {
        display: block;
        margin-top: 6px;
        font-size: 18px;
        line-height: 1.2;
        font-weight: 400;
        color: #666;
        opacity: 0.9;
        letter-spacing: 0;
        text-align: center;
        user-select: text;
        width: fit-content;
        max-width: 100%;
      }
      .${LABEL_CLASS}[data-state="resolved"] {
        cursor: pointer;
      }
      .${LABEL_CLASS}[data-state="unresolved"] {
        color: #888;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
  }

  function observeDocument() {
    const observer = new MutationObserver(() => {
      scanDocument();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: IMAGE_URL_ATTRS,
    });
  }

  function scanDocument() {
    const seen = new Set();
    for (const rule of COVER_RULES) {
      for (const img of document.querySelectorAll(rule)) {
        if (!(img instanceof HTMLImageElement) || seen.has(img)) {
          continue;
        }
        seen.add(img);
        processImage(img);
      }
    }
  }

  function processImage(img) {
    const iid = extractIidFromImage(img);
    if (!iid) {
      return;
    }
    const last = img.getAttribute(PROCESSED_ATTR);
    if (last === iid) {
      return;
    }
    img.setAttribute(PROCESSED_ATTR, iid);

    const decoded = decodeIid(iid);
    if (decoded) {
      upsertLabel(img, `${decoded.ssid}`, {
        state: "resolved",
        title: RESOLVED_TITLE,
        copyText: decoded.ssid,
      });
      return;
    }

    if (SHOW_UNRESOLVED) {
      upsertLabel(img, UNRESOLVED_TEXT, {
        state: "unresolved",
        title: UNRESOLVED_TITLE,
      });
    }
  }

  function extractIidFromImage(img) {
    for (const attr of IMAGE_URL_ATTRS) {
      const raw = img.getAttribute(attr);
      const iid = extractIidFromUrl(raw);
      if (iid) {
        return iid;
      }
    }
    return null;
  }

  function extractIidFromUrl(raw) {
    if (!raw || !raw.includes("iid=")) {
      return null;
    }
    try {
      const url = new URL(raw, location.href);
      const iid = (url.searchParams.get("iid") || "").trim().toLowerCase();
      if (/^([0-9a-f]{112}|[0-9a-f]{128}|[0-9a-f]{144})$/.test(iid)) {
        return iid;
      }
    } catch (_error) {
      // ignore
    }
    const match = raw.match(/[?&]iid=([0-9a-f]{112}|[0-9a-f]{128}|[0-9a-f]{144})(?:&|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function decodeIid(iid) {
    for (const profile of runtime.profiles) {
      if (iid.length !== profile.iidHexLength) {
        continue;
      }
      const decoded = decodeWithProfile(iid, runtime.sharedCodebook, runtime.final2DigitCodebooks, profile);
      if (decoded) {
        return decoded;
      }
    }
    return null;
  }

  function decodeWithProfile(iid, sharedCodebook, final2DigitCodebooks, profile) {
    const sourceSlotKey = iid.slice(profile.slotKeySliceStart, profile.slotKeySliceEnd);
    const canonicalShiftSlot = profile.directSlot
      ? sourceSlotKey
      : profile.slotKeyToShiftSlot[sourceSlotKey];
    if (!canonicalShiftSlot) {
      return null;
    }
    const final2DigitCodebook = final2DigitCodebooks[profile.final2DigitTable];
    const abc = sharedCodebook.inv3[canonicalShiftSlot] && sharedCodebook.inv3[canonicalShiftSlot][iid.slice(0, 6)];
    const def = sharedCodebook.inv3[canonicalShiftSlot] && sharedCodebook.inv3[canonicalShiftSlot][iid.slice(16, 22)];
    const gh = final2DigitCodebook[canonicalShiftSlot] && final2DigitCodebook[canonicalShiftSlot][iid.slice(32, 37)];
    if (!abc || !def || !gh) {
      return null;
    }
    return { kind: profile.kind, ssid: abc + def + gh, canonicalShiftSlot };
  }

  function upsertLabel(img, text, options = {}) {
    const target = findInsertionTarget(img);
    if (!target || !target.parentElement) {
      return;
    }
    let label = target.nextElementSibling;
    if (!label || !label.classList.contains(LABEL_CLASS)) {
      label = document.createElement("div");
      label.className = LABEL_CLASS;
      target.insertAdjacentElement("afterend", label);
    }
    label.textContent = text;
    label.dataset.state = options.state || "resolved";
    if (options.title) {
      label.title = options.title;
    }
    if (options.copyText) {
      label.onclick = () => copyText(options.copyText);
    } else {
      label.onclick = null;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function findInsertionTarget(img) {
    const link = img.closest("a");
    if (link && link.querySelector("img") === img) {
      return link;
    }
    return img;
  }

  function buildRuntime(payload) {
    return {
      sharedCodebook: buildRuntimeCodebook(payload.shared),
      final2DigitCodebooks: Object.fromEntries(
        Object.entries(payload.final_2digit_tables).map(([name, table]) => [
          name,
          buildInverse(table.code2, table.slots || [], 2),
        ])
      ),
      profiles: payload.profiles.map((profile) => ({
        kind: profile.kind,
        iidHexLength: profile.iid_hex_length,
        slotKeySliceStart: profile.slot_key_slice_start,
        slotKeySliceEnd: profile.slot_key_slice_end,
        directSlot: Boolean(profile.direct_slot),
        final2DigitTable: profile.final_2digit_table,
        slotKeyToShiftSlot: profile.slot_key_to_shift_slot || Object.create(null),
      })),
    };
  }

  function bootstrap(runtime) {
    window.__duxiuIidV3DecoderRuntime = runtime;
    injectStyle();
    scanDocument();
    observeDocument();
  }

  const PAYLOAD = __PAYLOAD_JSON__;
  const runtime = buildRuntime(PAYLOAD);
  bootstrap(runtime);
})();
