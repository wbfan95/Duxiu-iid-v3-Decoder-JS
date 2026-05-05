// ==UserScript==
// @name         DuXiu iid v3 Decoder
// @author       Wenbin Fan
// @namespace    https://github.com/wbfan95/duxiu-iid-v3-decoder
// @version      0.1.0
// @description  Decode 128/144-hex DuXiu-style cover iid to SSID and show it under the cover image.
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

  function buildRuntimeCodebook(raw) {
    const inv3 = Object.create(null);
    const inv2 = Object.create(null);
    for (const slot of raw.slots) {
      const slot3 = Object.create(null);
      const slot2 = Object.create(null);
      const arr3 = raw.code3[slot] || [];
      const arr2 = raw.code2[slot] || [];
      for (let i = 0; i < arr3.length; i += 1) {
        const selector = arr3[i];
        if (selector) {
          slot3[selector] = String(i).padStart(3, "0");
        }
      }
      for (let i = 0; i < arr2.length; i += 1) {
        const selector = arr2[i];
        if (selector) {
          slot2[selector] = String(i).padStart(2, "0");
        }
      }
      inv3[slot] = slot3;
      inv2[slot] = slot2;
    }
    return {
      inv3,
      inv2,
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
      if (/^[0-9a-f]{128}$/.test(iid) || /^[0-9a-f]{144}$/.test(iid)) {
        return iid;
      }
    } catch (_error) {
      // ignore
    }
    const match = raw.match(/[?&]iid=([0-9a-f]{128}|[0-9a-f]{144})(?:&|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function decodeIid(iid) {
    if (/^[0-9a-f]{128}$/.test(iid)) {
      return decode128(iid, runtime.code128);
    }
    if (/^[0-9a-f]{144}$/.test(iid)) {
      return decode144(iid, runtime.code128, runtime.alias144);
    }
    return null;
  }

  function decode128(iid, code128) {
    const slot = iid.slice(48, 50);
    const partA = iid.slice(0, 6);
    const partB = iid.slice(16, 22);
    const partC = iid.slice(32, 37);
    const abc = code128.inv3[slot] && code128.inv3[slot][partA];
    const def = code128.inv3[slot] && code128.inv3[slot][partB];
    const gh = code128.inv2[slot] && code128.inv2[slot][partC];
    if (!abc || !def || !gh) {
      return null;
    }
    return { kind: "128-v3", ssid: abc + def + gh };
  }

  function decode144(iid, code128, alias144) {
    const shortKey = iid.slice(alias144.sliceStart, alias144.sliceEnd);
    const slot128 = alias144.shortToSlot128[shortKey];
    if (!slot128) {
      return null;
    }
    const partA = iid.slice(0, 6);
    const partB = iid.slice(16, 22);
    const partC = iid.slice(32, 37);
    const abc = code128.inv3[slot128] && code128.inv3[slot128][partA];
    const def = code128.inv3[slot128] && code128.inv3[slot128][partB];
    const gh = code128.inv2[slot128] && code128.inv2[slot128][partC];
    if (!abc || !def || !gh) {
      return null;
    }
    return { kind: "144-v3", ssid: abc + def + gh, slot128 };
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
      code128: buildRuntimeCodebook(payload.code128),
      alias144: {
        sliceStart: payload.alias144.slice_start,
        sliceEnd: payload.alias144.slice_end,
        shortToSlot128: payload.alias144.short_to_slot128 || Object.create(null),
      },
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
