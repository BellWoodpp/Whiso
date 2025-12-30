(() => {
  const SINGLE_SUFFIXES = [
    "com",
    "box",
    "net",
    "org",
    "me",
    "xyz",
    "im",
    "info",
    "io",
    "co",
    "ai",
    "biz",
    "us",
    "app",
    "sg",
    "cafe",
    "now",
    "shop",
    "life",
    "cn",
    "uk",
    "chat",
    "design",
    "fun",
    "website",
    "link",
    "site",
    "online",
    "cards",
    "fr",
    "sk",
    "it",
    "new",
    "video"
  ];

  const MULTI_SUFFIXES = ["co.uk", "org.uk", "ac.uk", "gov.uk", "com.cn", "net.cn", "org.cn"];

  const STYLE_ID = "whois-domain-date-style";
  const STORAGE_KEY = "whois_domain_date_cache_v3";
  const TLD_LIST_KEY = "whois_domain_date_tld_list_v1";
  const SCOPE_KEY = "whois_domain_date_scope_v1";
  const POS_KEY = "whois_domain_date_panel_pos_v1";
  const SIZE_KEY = "whois_domain_date_panel_size_v1";
  const SIZE_SITE_KEY = "whois_domain_date_panel_size_site_v1";
  const SIZE_ALL_KEY = "whois_domain_date_panel_size_all_v1";
  const LANG_KEY = "whois_domain_date_panel_lang_v1";
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const NEGATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const TLD_LIST_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  const TLD_LIST_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

  const PANEL_ID = "whois-domain-date-panel";
  const PANEL_ATTR = "data-whois-panel";
  const DOMAIN_ATTR = "data-whois-domain";

  // Broad candidate matcher; final validation happens in `parseRegistrableDomain()`.
  const domainRegex =
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})\b/gi;

  let panel = null;
  let scope = "site";
  let scopeLoaded = false;
  let enabled = false;
  let posLoaded = false;
  let pos = { left: 10, top: 10 };
  let sizeLoaded = false;
  let sizeSite = null; // { width, height }
  let sizeAll = null; // { width, height }
  let langLoaded = false;
  let lang = null;
  let tldLoaded = false;
  let tldSet = null;

  const STRINGS = {
    en: {
      title: "WHOIS",
      scanning: "Scanning…",
      collecting: "Collecting domains…",
      noDomains: "No domains found.",
      regDateLabel: "Domain registration date",
      domainLabel: "Domain",
      durationLabel: "Domain duration",
      expiryDateLabel: "Domain expiration date",
      scopeSite: "SITE",
      scopeAll: "ALL",
      scopeTitle: "Toggle scope",
      langTitle: "Switch language",
      minimizeTitle: "Minimize",
      closeTitle: "Close",
      unknown: "(unknown)",
      age: (years, days) => {
        const parts = [];
        if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
        if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
        return parts.join(", ");
      },
      found: (n) => `Found ${n} domains`,
      querying: (done, total, all) => `Querying ${done}/${total} (total ${all})`,
      done: (n) => `Done (${n} domains)`
    },
    zh: {
      title: "WHOIS",
      scanning: "扫描中…",
      collecting: "正在收集域名…",
      noDomains: "未找到域名。",
      regDateLabel: "注册域名",
      domainLabel: "域名",
      durationLabel: "域名持续时间",
      expiryDateLabel: "域名到期时间",
      scopeSite: "本站",
      scopeAll: "全部",
      scopeTitle: "切换范围",
      langTitle: "切换语言",
      minimizeTitle: "最小化",
      closeTitle: "关闭",
      unknown: "(未知)",
      age: (years, days) => {
        const parts = [];
        if (years > 0) parts.push(`${years}年`);
        if (days > 0 || parts.length === 0) parts.push(`${days}天`);
        return parts.join("，");
      },
      found: (n) => `发现 ${n} 个域名`,
      querying: (done, total, all) => `查询中 ${done}/${total}（共 ${all}）`,
      done: (n) => `完成（${n} 个域名）`
    },
    ja: {
      title: "WHOIS",
      scanning: "スキャン中…",
      collecting: "ドメインを収集中…",
      noDomains: "ドメインが見つかりません。",
      regDateLabel: "ドメイン登録日",
      domainLabel: "ドメイン",
      durationLabel: "ドメイン継続期間",
      expiryDateLabel: "ドメイン有効期限",
      scopeSite: "サイト",
      scopeAll: "全部",
      scopeTitle: "範囲を切り替え",
      langTitle: "言語を切り替え",
      minimizeTitle: "最小化",
      closeTitle: "閉じる",
      unknown: "(不明)",
      age: (years, days) => {
        const parts = [];
        if (years > 0) parts.push(`${years}年`);
        if (days > 0 || parts.length === 0) parts.push(`${days}日`);
        return parts.join("、");
      },
      found: (n) => `ドメイン ${n} 件を検出`,
      querying: (done, total, all) => `照会中 ${done}/${total}（合計 ${all}）`,
      done: (n) => `完了（${n} 件）`
    }
  };

  const LANG_ORDER = ["en", "zh", "ja"];
  const LANG_LABELS = { en: "EN", zh: "中文", ja: "日本語" };

  function normalizeLang(v) {
    return v === "en" || v === "zh" || v === "ja" ? v : null;
  }

  function nextLang(current) {
    const cur = normalizeLang(current) || "en";
    const idx = LANG_ORDER.indexOf(cur);
    return LANG_ORDER[(idx >= 0 ? idx : 0) + 1] || LANG_ORDER[0];
  }

  function langFromLocaleTag(tag) {
    const v = String(tag || "").toLowerCase();
    if (!v) return null;
    if (v.startsWith("zh")) return "zh";
    if (v.startsWith("ja")) return "ja";
    if (v.startsWith("en")) return "en";
    return null;
  }

  function defaultLang() {
    const candidates = [];
    try {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    } catch {
      // ignore
    }
    try {
      if (typeof chrome !== "undefined" && chrome?.i18n?.getUILanguage) candidates.push(chrome.i18n.getUILanguage());
    } catch {
      // ignore
    }
    try {
      if (navigator.language) candidates.push(navigator.language);
    } catch {
      // ignore
    }

    for (const tag of candidates) {
      const picked = langFromLocaleTag(tag);
      if (picked) return picked;
    }

    return "en";
  }

  function t() {
    return STRINGS[normalizeLang(lang) || "en"] || STRINGS.en;
  }

  function parseIanaTldText(text) {
    const set = new Set();
    for (const line of String(text || "").split(/\r?\n/)) {
      const tld = line.trim();
      if (!tld || tld.startsWith("#")) continue;
      set.add(tld.toLowerCase());
    }
    return set.size > 0 ? set : null;
  }

  async function loadTldSetOnce() {
    if (tldLoaded) return tldSet;
    tldLoaded = true;

    try {
      const data = await chrome.storage.local.get([TLD_LIST_KEY]);
      const entry = data[TLD_LIST_KEY];
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.t === "number" &&
        typeof entry.v === "string" &&
        Date.now() - entry.t < TLD_LIST_TTL_MS
      ) {
        tldSet = parseIanaTldText(entry.v);
        if (tldSet) return tldSet;
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch(TLD_LIST_URL);
      const text = await res.text();
      tldSet = parseIanaTldText(text);
      if (tldSet) {
        try {
          await chrome.storage.local.set({ [TLD_LIST_KEY]: { t: Date.now(), v: text } });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    return tldSet;
  }

  async function loadScopeOnce() {
    if (scopeLoaded) return scope;
    scopeLoaded = true;
    try {
      const data = await chrome.storage.local.get([SCOPE_KEY]);
      const v = data[SCOPE_KEY];
      if (v === "all" || v === "site") scope = v;
    } catch {
      // ignore
    }
    return scope;
  }

  async function saveScope(nextScope) {
    scope = nextScope;
    try {
      await chrome.storage.local.set({ [SCOPE_KEY]: nextScope });
    } catch {
      // ignore
    }
  }

  async function loadPosOnce() {
    if (posLoaded) return pos;
    posLoaded = true;
    try {
      const data = await chrome.storage.local.get([POS_KEY]);
      const v = data[POS_KEY];
      if (v && typeof v === "object" && typeof v.left === "number" && typeof v.top === "number") {
        pos = { left: v.left, top: v.top };
      }
    } catch {
      // ignore
    }
    return pos;
  }

  async function savePos(nextPos) {
    pos = nextPos;
    try {
      await chrome.storage.local.set({ [POS_KEY]: nextPos });
    } catch {
      // ignore
    }
  }

  function defaultPanelSize() {
    const width = 600;
    const height = 100;
    return { width, height };
  }

  function normalizePanelSize(v) {
    if (
      v &&
      typeof v === "object" &&
      typeof v.width === "number" &&
      typeof v.height === "number" &&
      Number.isFinite(v.width) &&
      Number.isFinite(v.height)
    ) {
      return { width: Math.round(v.width), height: Math.round(v.height) };
    }
    return null;
  }

  function getActivePanelSize() {
    if (scope === "all") return sizeAll || defaultPanelSize();
    return sizeSite || defaultPanelSize();
  }

  function setActivePanelSize(nextSize) {
    if (scope === "all") sizeAll = nextSize;
    else sizeSite = nextSize;
  }

  async function loadSizeOnce() {
    if (sizeLoaded) return { sizeSite, sizeAll };
    sizeLoaded = true;

    try {
      const data = await chrome.storage.local.get([SIZE_SITE_KEY, SIZE_ALL_KEY, SIZE_KEY]);
      sizeSite = normalizePanelSize(data[SIZE_SITE_KEY]) || normalizePanelSize(data[SIZE_KEY]) || null;
      sizeAll = normalizePanelSize(data[SIZE_ALL_KEY]) || null;
      if (!sizeAll && sizeSite) sizeAll = { ...sizeSite };
    } catch {
      // ignore
    }

    if (!sizeSite) sizeSite = defaultPanelSize();
    if (!sizeAll) sizeAll = { ...sizeSite };
    return { sizeSite, sizeAll };
  }

  async function saveSize(nextSize) {
    setActivePanelSize(nextSize);
    try {
      const key = scope === "all" ? SIZE_ALL_KEY : SIZE_SITE_KEY;
      await chrome.storage.local.set({ [key]: nextSize });
    } catch {
      // ignore
    }
  }

  function applyHostPosition(host) {
    const left = Number.isFinite(pos.left) ? pos.left : 10;
    const top = Number.isFinite(pos.top) ? pos.top : 10;
    host.style.left = `${Math.max(0, left)}px`;
    host.style.top = `${Math.max(0, top)}px`;
  }

  async function loadLangOnce() {
    if (langLoaded) return lang;
    langLoaded = true;
    try {
      const data = await chrome.storage.local.get([LANG_KEY]);
      const v = data[LANG_KEY];
      if (v === "en" || v === "zh" || v === "ja") {
        lang = v;
        return lang;
      }
    } catch {
      // ignore
    }
    lang = defaultLang();
    return lang;
  }

  async function saveLang(nextLang) {
    lang = nextLang;
    try {
      await chrome.storage.local.set({ [LANG_KEY]: nextLang });
    } catch {
      // ignore
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".whois-domain-date{color:#2e7d32;font-weight:700;background:#e8f5e8;padding:1px 3px;border-radius:2px;font-size:.9em;margin-right:2px;vertical-align:baseline}";
    (document.head || document.documentElement).appendChild(style);
  }

  function ensurePanel() {
    if (panel && panel.root?.isConnected) return panel;
    const S = t();

    const host = document.createElement("div");
    host.id = PANEL_ID;
    host.setAttribute(PANEL_ATTR, "1");
    host.style.cssText = "position:fixed;left:10px;top:10px;z-index:2147483647";
    applyHostPosition(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      .wrap{font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial; color:#eaeaea;}
      .card{width:320px; height:260px; background:rgba(20,20,20,.92); border:1px solid rgba(255,255,255,.14); border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.35); overflow:hidden; display:flex; flex-direction:column; position:relative;}
      .head{display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.12); cursor:move; user-select:none;}
      .logo{width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; opacity:.92;}
      .logo svg{width:16px; height:16px; stroke:#eaeaea; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;}
      .title{font-weight:700; letter-spacing:.2px;}
      .status{opacity:.85; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
      button{all:unset; cursor:pointer; padding:2px 6px; border-radius:6px; opacity:.9;}
      button:hover{background:rgba(255,255,255,.12);}
      .wrap{color-scheme:dark;}
      select{appearance:none; -webkit-appearance:none; background:rgba(20,20,20,.92); color:#eaeaea; cursor:pointer; padding:2px 18px 2px 6px; border-radius:6px; border:1px solid rgba(255,255,255,.18); opacity:.92; font:inherit; line-height:1.2;}
      select:hover{background:rgba(255,255,255,.12);}
      select:focus{outline:2px solid rgba(155,231,162,.5); outline-offset:1px;}
      option{background:#141414; color:#eaeaea;}
      .body{padding:8px 10px; overflow:auto; flex:1;}
      .row{padding:6px 0; border-bottom:1px dashed rgba(255,255,255,.12);}
      .row:last-child{border-bottom:none;}
      .line{display:grid; grid-template-columns: 1fr 2fr 1fr 1fr; column-gap:10px; align-items:baseline; white-space:nowrap;}
      .cell{min-width:0; text-align:center;}
      .k{opacity:.75; color:#cfd8dc; font-size:11px;}
      .v{color:#fff; min-width:0;}
      .v.date{color:#9be7a2; font-weight:700;}
      .v.date.miss{color:#bdbdbd; font-weight:600;}
      .v.domain{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
      .v.age{opacity:.82; color:#cfd8dc; font-weight:600; white-space:nowrap;}
      .hint{opacity:.75; padding:6px 0;}
      .min .body{display:none;}
      .min .card{width:240px; height:auto;}
      .grip{position:absolute; z-index:5;}
      .grip-e{top:0; right:0; width:6px; height:100%; cursor:ew-resize;}
      .grip-w{top:0; left:0; width:6px; height:100%; cursor:ew-resize;}
      .grip-s{left:0; bottom:0; width:100%; height:6px; cursor:ns-resize;}
      .grip-n{left:0; top:0; width:100%; height:6px; cursor:ns-resize;}
      .grip-se{right:2px; bottom:2px; width:14px; height:14px; cursor:nwse-resize; opacity:.65; z-index:6; background:linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,.35) 50%, rgba(255,255,255,.35) 60%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 70%, rgba(255,255,255,.35) 70%, rgba(255,255,255,.35) 80%, rgba(255,255,255,0) 80%);}
      .min .grip{display:none;}
    `;

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.innerHTML = `
      <div class="card">
        <div class="head" id="head">
          <span class="logo" id="logo" aria-hidden="true"></span>
          <span class="title" id="title"></span>
          <span class="status" id="status"></span>
          <select id="lang" title=""></select>
          <select id="scope" title=""></select>
          <button id="toggle" title="">–</button>
          <button id="close" title="">×</button>
        </div>
        <div class="body" id="body">
          <div class="hint" id="hint"></div>
        </div>
        <div class="grip grip-n" id="grip-n"></div>
        <div class="grip grip-e" id="grip-e"></div>
        <div class="grip grip-s" id="grip-s"></div>
        <div class="grip grip-w" id="grip-w"></div>
        <div class="grip grip-se" id="grip-se"></div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrap);
    document.documentElement.appendChild(host);

    const statusEl = shadow.getElementById("status");
    const bodyEl = shadow.getElementById("body");
    const scopeEl = shadow.getElementById("scope");
    const headEl = shadow.getElementById("head");
    const titleEl = shadow.getElementById("title");
    const hintEl = shadow.getElementById("hint");
    const logoEl = shadow.getElementById("logo");
    const langEl = shadow.getElementById("lang");
    const toggleEl = shadow.getElementById("toggle");
    const closeEl = shadow.getElementById("close");
    const cardEl = shadow.querySelector(".card");
    const gripNEl = shadow.getElementById("grip-n");
    const gripEEl = shadow.getElementById("grip-e");
    const gripSEl = shadow.getElementById("grip-s");
    const gripWEl = shadow.getElementById("grip-w");
    const gripSEEl = shadow.getElementById("grip-se");

    const applyCardSize = () => {
      if (!cardEl) return;
      const activeSize = getActivePanelSize();
      if (wrap.classList.contains("min")) {
        cardEl.style.width = "";
        cardEl.style.height = "";
        return;
      }
      cardEl.style.width = `${Math.round(activeSize.width)}px`;
      cardEl.style.height = `${Math.round(activeSize.height)}px`;
    };
    applyCardSize();

    if (logoEl) {
      logoEl.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M3 12h18"></path>
          <path d="M12 3c3.5 3.6 3.5 13.4 0 18"></path>
          <path d="M12 3c-3.5 3.6-3.5 13.4 0 18"></path>
        </svg>
      `.trim();
    }

    const autoExpandCardHeight = () => {
      if (!cardEl || !bodyEl || !headEl) return;
      if (wrap.classList.contains("min")) return;
      const activeSize = getActivePanelSize();

      const rect = host.getBoundingClientRect();
      const available = Math.max(120, Math.floor(window.innerHeight - rect.top - 10));
      const maxH = Math.min(available, Math.round(window.innerHeight * 0.85));

      const headH = headEl.getBoundingClientRect().height || 0;
      const desired = Math.ceil(headH + bodyEl.scrollHeight + 2);
      const current = Math.ceil(cardEl.getBoundingClientRect().height);

      if (desired <= current + 1) return;

      setActivePanelSize({ width: activeSize.width, height: Math.min(desired, maxH) });
      applyCardSize();
    };

    if (titleEl) titleEl.textContent = S.title;
    if (statusEl) statusEl.textContent = S.scanning;
    if (hintEl) hintEl.textContent = S.collecting;
    if (scopeEl) scopeEl.title = S.scopeTitle;
    if (toggleEl) toggleEl.title = S.minimizeTitle;
    if (closeEl) closeEl.title = S.closeTitle;

    const refreshLangSelect = () => {
      if (!langEl) return;
      const current = normalizeLang(lang) || "en";
      try {
        langEl.innerHTML = LANG_ORDER.map((code) => `<option value="${code}">${LANG_LABELS[code] || code}</option>`).join("");
        langEl.value = current;
      } catch {
        // ignore
      }
      langEl.title = t().langTitle;
    };
    refreshLangSelect();

    const refreshScopeSelect = () => {
      if (!scopeEl) return;
      const S2 = t();
      const current = scope === "all" ? "all" : "site";
      try {
        scopeEl.innerHTML = `<option value="site">${S2.scopeSite}</option><option value="all">${S2.scopeAll}</option>`;
        scopeEl.value = current;
      } catch {
        // ignore
      }
      scopeEl.title = S2.scopeTitle;
    };
    refreshScopeSelect();

    closeEl?.addEventListener("click", () => {
      enabled = false;
      host.remove();
    });
    toggleEl?.addEventListener("click", () => {
      wrap.classList.toggle("min");
      applyCardSize();
    });
    scopeEl?.addEventListener("change", async () => {
      const next = scopeEl.value === "all" ? "all" : "site";
      await saveScope(next);
      if (panel) panel.setScope(next);
      try {
        document.documentElement.dispatchEvent(new CustomEvent("whois-domain-date-scope-changed"));
      } catch {
        // ignore
      }
    });
    langEl?.addEventListener("change", async () => {
      const next = normalizeLang(langEl.value) || "en";
      await saveLang(next);
      if (panel) panel.setLang(next);
      try {
        document.documentElement.dispatchEvent(new CustomEvent("whois-domain-date-lang-changed"));
      } catch {
        // ignore
      }
    });

    if (headEl) {
      let drag = null;
      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

      headEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const path = typeof e.composedPath === "function" ? e.composedPath() : [];
        if (path.some((el) => el && (el.tagName === "BUTTON" || el.tagName === "SELECT"))) return;
        e.preventDefault();
        const rect = host.getBoundingClientRect();
        drag = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top, pointerId: e.pointerId };
        try {
          headEl.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      });

      headEl.addEventListener("pointermove", (e) => {
        if (!drag || drag.pointerId !== e.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const nextLeft = clamp(drag.startLeft + dx, 0, Math.max(0, window.innerWidth - 40));
        const nextTop = clamp(drag.startTop + dy, 0, Math.max(0, window.innerHeight - 40));
        host.style.left = `${Math.round(nextLeft)}px`;
        host.style.top = `${Math.round(nextTop)}px`;
      });

      const endDrag = async (e) => {
        if (!drag || drag.pointerId !== e.pointerId) return;
        drag = null;
        try {
          headEl.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        const left = parseInt(host.style.left || "10", 10);
        const top = parseInt(host.style.top || "10", 10);
        if (Number.isFinite(left) && Number.isFinite(top)) await savePos({ left, top });
      };

      headEl.addEventListener("pointerup", (e) => void endDrag(e));
      headEl.addEventListener("pointercancel", (e) => void endDrag(e));
    }

    const attachResize = (handleEl, dir) => {
      if (!handleEl || !cardEl) return;
      let resizing = null;
      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
      const minW = 240;
      const minH = 120;
      const margin = 10;

      handleEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (wrap.classList.contains("min")) return;
        e.preventDefault();
        const rect = host.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        resizing = {
          dir,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: rect.left,
          startTop: rect.top,
          startWidth: cardRect.width,
          startHeight: cardRect.height,
          pointerId: e.pointerId
        };
        try {
          handleEl.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      });

      handleEl.addEventListener("pointermove", (e) => {
        if (!resizing || resizing.pointerId !== e.pointerId) return;
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;

        const rightLimit = Math.min(resizing.startLeft + resizing.startWidth, window.innerWidth - margin);
        const bottomLimit = Math.min(resizing.startTop + resizing.startHeight, window.innerHeight - margin);

        let nextLeft = resizing.startLeft;
        let nextTop = resizing.startTop;
        let nextW = resizing.startWidth;
        let nextH = resizing.startHeight;

        if (resizing.dir.includes("e")) {
          const maxW = Math.max(minW, window.innerWidth - margin - resizing.startLeft);
          nextW = clamp(resizing.startWidth + dx, minW, maxW);
        }
        if (resizing.dir.includes("s")) {
          const maxH = Math.max(minH, window.innerHeight - margin - resizing.startTop);
          nextH = clamp(resizing.startHeight + dy, minH, maxH);
        }
        if (resizing.dir.includes("w")) {
          const maxW = Math.max(minW, rightLimit);
          nextW = clamp(resizing.startWidth - dx, minW, maxW);
          nextLeft = clamp(rightLimit - nextW, 0, Math.max(0, window.innerWidth - margin - minW));
        }
        if (resizing.dir.includes("n")) {
          const maxH = Math.max(minH, bottomLimit);
          nextH = clamp(resizing.startHeight - dy, minH, maxH);
          nextTop = clamp(bottomLimit - nextH, 0, Math.max(0, window.innerHeight - margin - minH));
        }

        host.style.left = `${Math.round(nextLeft)}px`;
        host.style.top = `${Math.round(nextTop)}px`;
        pos = { left: Math.round(nextLeft), top: Math.round(nextTop) };

        setActivePanelSize({ width: Math.round(nextW), height: Math.round(nextH) });
        applyCardSize();
      });

      const endResize = async (e) => {
        if (!resizing || resizing.pointerId !== e.pointerId) return;
        resizing = null;
        try {
          handleEl.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }

        const left = parseInt(host.style.left || "10", 10);
        const top = parseInt(host.style.top || "10", 10);
        if (Number.isFinite(left) && Number.isFinite(top)) await savePos({ left, top });
        const activeSize = getActivePanelSize();
        if (activeSize) await saveSize({ width: Math.round(activeSize.width), height: Math.round(activeSize.height) });
      };

      handleEl.addEventListener("pointerup", (e) => void endResize(e));
      handleEl.addEventListener("pointercancel", (e) => void endResize(e));
    };

    attachResize(gripEEl, "e");
    attachResize(gripWEl, "w");
    attachResize(gripSEl, "s");
    attachResize(gripNEl, "n");
    attachResize(gripSEEl, "se");

    panel = {
      root: host,
      statusEl,
      bodyEl,
      scopeEl,
      langEl,
      titleEl,
      hintEl,
      rows: new Map(),
      refreshLabels() {
        const S2 = t();
        for (const [, row] of this.rows.entries()) {
          const regEl = row.querySelector('[data-k="reg"]');
          const domEl = row.querySelector('[data-k="dom"]');
          const ageEl = row.querySelector('[data-k="age"]');
          const expEl = row.querySelector('[data-k="exp"]');
          if (regEl) regEl.textContent = S2.regDateLabel;
          if (domEl) domEl.textContent = S2.domainLabel;
          if (ageEl) ageEl.textContent = S2.durationLabel;
          if (expEl) expEl.textContent = S2.expiryDateLabel;
        }
      },
      refreshAges() {
        const S2 = t();
        for (const [, row] of this.rows.entries()) {
          const ageEl = row.querySelector("[data-age]");
          if (!ageEl) continue;
          const prefix = row.dataset?.prefix || "";
          const age = prefix ? computeYearsDaysSince(prefix) : null;
          ageEl.textContent = age ? S2.age(age.years, age.days) : "";
        }
      },
      setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
      },
      setScope(next) {
        const S2 = t();
        if (this.scopeEl) {
          try {
            this.scopeEl.innerHTML = `<option value="site">${S2.scopeSite}</option><option value="all">${S2.scopeAll}</option>`;
            this.scopeEl.value = next === "all" ? "all" : "site";
          } catch {
            // ignore
          }
          this.scopeEl.title = S2.scopeTitle;
        }
        applyCardSize();
      },
      setLang(next) {
        const S2 = t();
        if (this.titleEl) this.titleEl.textContent = S2.title;
        if (this.hintEl) this.hintEl.textContent = S2.collecting;
        if (this.langEl) {
          const current = normalizeLang(next) || "en";
          try {
            this.langEl.value = current;
          } catch {
            // ignore
          }
          this.langEl.title = S2.langTitle;
        }
        this.setScope(scope);
        this.refreshLabels();
        this.refreshAges();
      },
      setDomains(domains) {
        const S2 = t();
        if (!this.bodyEl) return;
        const next = new Set(domains);
        for (const [domain, row] of this.rows.entries()) {
          if (!next.has(domain)) {
            row.remove();
            this.rows.delete(domain);
          }
        }
        if (domains.length === 0) {
          this.bodyEl.innerHTML = `<div class="hint">${S2.noDomains}</div>`;
          return;
        }
        if (this.rows.size === 0) this.bodyEl.textContent = "";
        for (const domain of domains) {
          if (this.rows.has(domain)) continue;
          const row = document.createElement("div");
          row.className = "row";
          row.innerHTML = `
            <div class="line labels">
              <span class="cell k" data-k="reg"></span>
              <span class="cell dom k" data-k="dom"></span>
              <span class="cell k" data-k="age"></span>
              <span class="cell k" data-k="exp"></span>
            </div>
            <div class="line values">
              <span class="cell v date miss" data-created>…</span>
              <span class="cell dom v domain" data-dom></span>
              <span class="cell v age" data-age></span>
              <span class="cell v date miss" data-expiry>…</span>
            </div>
          `;
          const domEl = row.querySelector("[data-dom]");
          if (domEl) domEl.textContent = domain;
          this.bodyEl.appendChild(row);
          this.rows.set(domain, row);
        }
        this.refreshLabels();
        requestAnimationFrame(() => autoExpandCardHeight());
      },
      setDomainValue(domain, value) {
        const S2 = t();
        const row = this.rows.get(domain);
        if (!row) return;

        const createdEl = row.querySelector("[data-created]");
        const expiryEl = row.querySelector("[data-expiry]");
        const ageEl = row.querySelector("[data-age]");
        if (!createdEl || !expiryEl) return;

        let createdPrefix = null;
        let expiryPrefix = null;
        if (typeof value === "string") {
          createdPrefix = value;
        } else if (value && typeof value === "object") {
          createdPrefix =
            (Object.prototype.hasOwnProperty.call(value, "createdPrefix") && value.createdPrefix) ||
            (Object.prototype.hasOwnProperty.call(value, "created") && value.created) ||
            (Object.prototype.hasOwnProperty.call(value, "v") && value.v) ||
            null;
          expiryPrefix =
            (Object.prototype.hasOwnProperty.call(value, "expiryPrefix") && value.expiryPrefix) ||
            (Object.prototype.hasOwnProperty.call(value, "expiry") && value.expiry) ||
            (Object.prototype.hasOwnProperty.call(value, "e") && value.e) ||
            null;
        }

        row.dataset.prefix = createdPrefix ? String(createdPrefix) : "";
        if (value === undefined) {
          createdEl.textContent = "…";
          createdEl.classList.add("miss");
          expiryEl.textContent = "…";
          expiryEl.classList.add("miss");
          if (ageEl) ageEl.textContent = "";
        } else {
          if (createdPrefix) {
            createdEl.textContent = createdPrefix;
            createdEl.classList.remove("miss");
            const age = computeYearsDaysSince(createdPrefix);
            if (ageEl) ageEl.textContent = age ? S2.age(age.years, age.days) : "";
          } else {
            createdEl.textContent = S2.unknown;
            createdEl.classList.add("miss");
            if (ageEl) ageEl.textContent = "";
          }

          if (expiryPrefix) {
            expiryEl.textContent = expiryPrefix;
            expiryEl.classList.remove("miss");
          } else {
            expiryEl.textContent = S2.unknown;
            expiryEl.classList.add("miss");
          }
        }
      }
    };

    return panel;
  }

  function normalizeHostname(host) {
    let raw = String(host || "").trim().toLowerCase();
    raw = raw.replace(/^\.+/g, "").replace(/\.+$/g, "");
    if (!raw || raw.includes("..")) return null;

    // Convert possible IDN (unicode) to punycode via URL parsing.
    if (/[^a-z0-9.-]/i.test(raw)) {
      try {
        raw = new URL(`http://${raw}`).hostname.toLowerCase();
      } catch {
        return null;
      }
    }

    return raw;
  }

  function isValidDnsLabel(label) {
    if (!label) return false;
    if (label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    return /^[a-z0-9-]+$/i.test(label);
  }

  function parseRegistrableDomain(domainOrHost) {
    const raw = normalizeHostname(domainOrHost);
    if (!raw) return null;
    if (raw.length > 253) return null;

    const labels = raw.split(".");
    if (labels.length < 2) return null;
    if (!labels.every(isValidDnsLabel)) return null;

    for (const suffix of MULTI_SUFFIXES) {
      const suffixLabels = suffix.split(".");
      if (labels.length <= suffixLabels.length) continue;
      if (labels.slice(-suffixLabels.length).join(".") !== suffix) continue;
      const name = labels[labels.length - suffixLabels.length - 1];
      if (!name) return null;
      return { name, suffix, domain: `${name}.${suffix}` };
    }

    const suffix = labels[labels.length - 1];
    const name = labels[labels.length - 2];
    if (tldSet) {
      if (!tldSet.has(suffix)) return null;
    } else {
      // Fallback to a small allow-list if IANA list isn't available yet.
      if (!SINGLE_SUFFIXES.includes(suffix)) return null;
    }
    if (!name) return null;
    return { name, suffix, domain: `${name}.${suffix}` };
  }

  function formatCreationDate(creationDatetime) {
    const date = new Date(String(creationDatetime).trim());
    if (Number.isNaN(date.getTime())) return null;
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `(${yyyy}.${mm}.${dd})`;
  }

  function daysInMonthUtc(year, month1based) {
    const d = new Date(Date.UTC(year, month1based, 0));
    return d.getUTCDate();
  }

  function makeUtcDateYmd(year, month1based, day) {
    const m = Math.min(12, Math.max(1, Number(month1based)));
    const maxDay = daysInMonthUtc(year, m);
    const d = Math.min(maxDay, Math.max(1, Number(day)));
    return new Date(Date.UTC(year, m - 1, d));
  }

  function toUtcMidnight(date) {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function parseYmdFromPrefix(prefix) {
    const m = String(prefix || "").match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (!m) return null;
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
    if (yyyy < 1970 || yyyy > 9999) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;
    return { yyyy, mm, dd };
  }

  function computeYearsDaysSince(prefix, now = new Date()) {
    const ymd = parseYmdFromPrefix(prefix);
    if (!ymd) return null;

    const start = makeUtcDateYmd(ymd.yyyy, ymd.mm, ymd.dd);
    const end = toUtcMidnight(now);
    if (end.getTime() < start.getTime()) return null;

    let years = end.getUTCFullYear() - ymd.yyyy;
    if (years < 0) years = 0;

    let anniversary = makeUtcDateYmd(ymd.yyyy + years, ymd.mm, ymd.dd);
    if (anniversary.getTime() > end.getTime() && years > 0) {
      years -= 1;
      anniversary = makeUtcDateYmd(ymd.yyyy + years, ymd.mm, ymd.dd);
    }

    const days = Math.floor((end.getTime() - anniversary.getTime()) / 86400000);
    return { years, days: Math.max(0, days) };
  }

  async function readCache() {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      return typeof data[STORAGE_KEY] === "object" && data[STORAGE_KEY] ? data[STORAGE_KEY] : {};
    } catch {
      return {};
    }
  }

  async function writeCache(cache) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: cache });
    } catch {
      // ignore
    }
  }

  function isFresh(entry) {
    if (!entry) return false;
    if (typeof entry !== "object") return false;
    if (typeof entry.t !== "number") return false;
    const ttl = entry.v || entry.e ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
    return Date.now() - entry.t < ttl;
  }

  async function queryFreeAiWhois(parsed) {
    const url = `https://whois.freeaiapi.xyz/?name=${encodeURIComponent(parsed.name)}&suffix=${encodeURIComponent(parsed.suffix)}&c=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.status !== "ok") return null;
    const createdPrefix = data.creation_datetime ? formatCreationDate(data.creation_datetime) : null;
    const expiryPrefix = data.expiry_datetime ? formatCreationDate(data.expiry_datetime) : null;
    if (!createdPrefix && !expiryPrefix) return null;
    return { createdPrefix, expiryPrefix };
  }

  function findRdapEventDate(rdapJson, actions) {
    const events = Array.isArray(rdapJson?.events) ? rdapJson.events : [];
    const normalized = new Set((actions || []).map((a) => String(a || "").toLowerCase()).filter(Boolean));
    if (normalized.size === 0) return null;

    const event = events.find((e) => normalized.has(String(e?.eventAction || "").toLowerCase())) || null;
    const eventDate = event?.eventDate;
    if (!eventDate) return null;
    return formatCreationDate(eventDate);
  }

  function extractRdapDates(rdapJson) {
    const createdPrefix = findRdapEventDate(rdapJson, ["registration", "created"]);
    const expiryPrefix = findRdapEventDate(rdapJson, ["expiration", "expiry", "expires"]);
    if (!createdPrefix && !expiryPrefix) return null;
    return { createdPrefix, expiryPrefix };
  }

  async function queryRdap(domain) {
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    const res = await fetch(url, { headers: { accept: "application/rdap+json,application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return extractRdapDates(data);
  }

  async function queryWhois(registrableDomain) {
    const parsed = parseRegistrableDomain(registrableDomain);
    if (!parsed) return null;

    try {
      const v = await queryFreeAiWhois(parsed);
      if (v && v.createdPrefix && v.expiryPrefix) return v;
      if (v) {
        try {
          const r = await queryRdap(parsed.domain);
          if (r) {
            return {
              createdPrefix: v.createdPrefix || r.createdPrefix || null,
              expiryPrefix: v.expiryPrefix || r.expiryPrefix || null
            };
          }
        } catch {
          // ignore
        }
        return v;
      }
    } catch {
      // ignore
    }

    try {
      return await queryRdap(parsed.domain);
    } catch {
      return null;
    }
  }

  function shouldSkipTextNode(textNode) {
    const parent = textNode.parentElement;
    if (!parent) return true;
    const tag = parent.tagName;
    if (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "NOSCRIPT" ||
      tag === "TEXTAREA" ||
      tag === "INPUT" ||
      tag === "CODE" ||
      tag === "PRE"
    ) {
      return true;
    }
    if (parent.closest(`[${PANEL_ATTR}]`)) return true;
    if (parent.closest(`[${DOMAIN_ATTR}]`)) return true;
    return false;
  }

  function collectDomainsFromTextNodes() {
    const domains = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (shouldSkipTextNode(node)) continue;
      const text = node.nodeValue || "";
      domainRegex.lastIndex = 0;
      const matches = text.match(domainRegex);
      if (!matches) continue;
      for (const d of matches) {
        const parsed = parseRegistrableDomain(d);
        if (parsed?.domain) domains.add(parsed.domain);
      }
    }
    return Array.from(domains);
  }

  function collectDomainsFromUrls() {
    const domains = new Set();
    const selectors = [
      "a[href]",
      "link[href]",
      "script[src]",
      "img[src]",
      "iframe[src]",
      "source[src]",
      "video[src]",
      "audio[src]",
      "form[action]"
    ];
    const nodes = document.querySelectorAll(selectors.join(","));
    for (const node of nodes) {
      const attr =
        node.getAttribute("href") ??
        node.getAttribute("src") ??
        node.getAttribute("action") ??
        "";
      if (!attr) continue;
      let url;
      try {
        url = new URL(attr, location.href);
      } catch {
        continue;
      }
      if (!url.hostname) continue;
      const parsed = parseRegistrableDomain(url.hostname);
      if (parsed?.domain) domains.add(parsed.domain);
    }
    const selfParsed = parseRegistrableDomain(location.hostname);
    if (selfParsed?.domain) domains.add(selfParsed.domain);
    return Array.from(domains);
  }

  function annotateTextNode(textNode, domainToPrefix) {
    const text = textNode.nodeValue || "";
    domainRegex.lastIndex = 0;
    const matches = [...text.matchAll(domainRegex)];
    if (matches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    for (const match of matches) {
      const matched = match[0];
      const start = match.index ?? 0;
      const end = start + matched.length;
      const parsed = parseRegistrableDomain(matched);
      const registrable = parsed?.domain;
      const prefix = registrable ? domainToPrefix.get(registrable) : null;

      if (start > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      if (prefix && registrable) {
        const prefixSpan = document.createElement("span");
        prefixSpan.className = "whois-domain-date";
        prefixSpan.textContent = prefix;
        fragment.appendChild(prefixSpan);

        const domainSpan = document.createElement("span");
        domainSpan.setAttribute(DOMAIN_ATTR, registrable);
        domainSpan.textContent = matched;
        fragment.appendChild(domainSpan);
      } else {
        fragment.appendChild(document.createTextNode(matched));
      }

      lastIndex = end;
    }

    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  function applyPrefixes(domainToPrefix) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (shouldSkipTextNode(node)) continue;
      domainRegex.lastIndex = 0;
      if (!(node.nodeValue || "").match(domainRegex)) continue;
      textNodes.push(node);
    }
    for (const textNode of textNodes) annotateTextNode(textNode, domainToPrefix);
  }

  async function runOnce() {
    if (!document.body) return;
    if (!enabled) return;
    ensureStyle();

    const ui = ensurePanel();
    await loadTldSetOnce();
    await loadScopeOnce();
    await loadLangOnce();
    ui.setLang(lang);
    ui.setScope(scope);

    const selfDomain = parseRegistrableDomain(location.hostname)?.domain || null;
    const domains =
      scope === "site" ? (selfDomain ? [selfDomain] : []) : Array.from(new Set([...collectDomainsFromUrls(), ...collectDomainsFromTextNodes()]));

    domains.sort((a, b) => a.localeCompare(b));
    const S = t();
    ui.setDomains(domains);
    ui.setStatus(S.found(domains.length));
    if (domains.length === 0) return;

    const cache = await readCache();
    const domainToPrefix = new Map();
    let cacheChanged = false;

    const toFetch = [];
    for (const domain of domains) {
      const cachedEntry = cache[domain];
      if (isFresh(cachedEntry)) {
        const createdPrefix = Object.prototype.hasOwnProperty.call(cachedEntry, "v") ? cachedEntry.v : null;
        const expiryPrefix = Object.prototype.hasOwnProperty.call(cachedEntry, "e") ? cachedEntry.e : null;
        domainToPrefix.set(domain, createdPrefix);
        ui.setDomainValue(domain, { createdPrefix, expiryPrefix });
      } else {
        toFetch.push(domain);
        ui.setDomainValue(domain, undefined);
      }
    }

    let completed = 0;
    if (toFetch.length > 0) ui.setStatus(S.querying(completed, toFetch.length, domains.length));

    const concurrency = 3;
    const queue = toFetch.slice();

    const worker = async () => {
      while (queue.length > 0) {
        const domain = queue.shift();
        if (!domain) return;
        let result = null;
        try {
          result = await queryWhois(domain);
        } catch {
          result = null;
        }
        const createdPrefix = result?.createdPrefix || null;
        const expiryPrefix = result?.expiryPrefix || null;
        cache[domain] = { v: createdPrefix, e: expiryPrefix, t: Date.now() };
        cacheChanged = true;
        domainToPrefix.set(domain, createdPrefix);
        ui.setDomainValue(domain, result);
        completed += 1;
        ui.setStatus(S.querying(completed, toFetch.length, domains.length));
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, toFetch.length) }, () => worker()));

    if (cacheChanged) await writeCache(cache);
    applyPrefixes(domainToPrefix);
    ui.setStatus(S.done(domains.length));
  }

  let scheduled = false;
  let running = false;
  let pending = false;
  function scheduleRun() {
    if (!enabled) return;
    if (scheduled) return;
    scheduled = true;
    setTimeout(async () => {
      scheduled = false;
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        await runOnce();
      } catch {
        // ignore
      }
      running = false;
      if (pending) {
        pending = false;
        scheduleRun();
      }
    }, 900);
  }

  function hidePanel() {
    enabled = false;
    if (panel?.root?.isConnected) panel.root.remove();
  }

  async function showPanel() {
    enabled = true;
    await loadPosOnce();
    await loadScopeOnce();
    await loadLangOnce();
    await loadSizeOnce();
    ensurePanel();
    scheduleRun();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "toggle-whois-panel") return;
    if (enabled) hidePanel();
    else void showPanel();
  });

  // activeTab model: only show after user clicks the extension icon.

  const observer = new MutationObserver(() => scheduleRun());
  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    // ignore
  }

  document.documentElement.addEventListener("whois-domain-date-scope-changed", () => scheduleRun());
  document.documentElement.addEventListener("whois-domain-date-lang-changed", () => scheduleRun());
})();
