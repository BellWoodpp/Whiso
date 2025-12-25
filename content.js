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
  const STORAGE_KEY = "whois_domain_date_cache_v2";
  const SCOPE_KEY = "whois_domain_date_scope_v1";
  const POS_KEY = "whois_domain_date_panel_pos_v1";
  const LANG_KEY = "whois_domain_date_panel_lang_v1";
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  const PANEL_ID = "whois-domain-date-panel";
  const PANEL_ATTR = "data-whois-panel";
  const DOMAIN_ATTR = "data-whois-domain";

  const suffixAlternatives = [...MULTI_SUFFIXES, ...SINGLE_SUFFIXES].map((s) => s.replace(/\./g, "\\.")).join("|");
  const domainRegex = new RegExp(`\\b(?:[a-zA-Z0-9-]+\\.)+(?:${suffixAlternatives})\\b`, "g");

  let panel = null;
  let scope = "site";
  let scopeLoaded = false;
  let enabled = false;
  let posLoaded = false;
  let pos = { left: 10, top: 10 };
  let langLoaded = false;
  let lang = null;

  const STRINGS = {
    en: {
      title: "WHOIS",
      scanning: "Scanning…",
      collecting: "Collecting domains…",
      noDomains: "No domains found.",
      scopeSite: "SITE",
      scopeAll: "ALL",
      scopeTitle: "Toggle scope",
      langToZh: "中文",
      langToEn: "EN",
      langTitle: "Switch language",
      minimizeTitle: "Minimize",
      closeTitle: "Close",
      unknown: "(unknown)",
      found: (n) => `Found ${n} domains`,
      querying: (done, total, all) => `Querying ${done}/${total} (total ${all})`,
      done: (n) => `Done (${n} domains)`
    },
    zh: {
      title: "WHOIS",
      scanning: "扫描中…",
      collecting: "正在收集域名…",
      noDomains: "未找到域名。",
      scopeSite: "本站",
      scopeAll: "全部",
      scopeTitle: "切换范围",
      langToZh: "中文",
      langToEn: "EN",
      langTitle: "切换语言",
      minimizeTitle: "最小化",
      closeTitle: "关闭",
      unknown: "(未知)",
      found: (n) => `发现 ${n} 个域名`,
      querying: (done, total, all) => `查询中 ${done}/${total}（共 ${all}）`,
      done: (n) => `完成（${n} 个域名）`
    }
  };

  function defaultLang() {
    const v = String(navigator.language || "").toLowerCase();
    return v.startsWith("zh") ? "zh" : "en";
  }

  function t() {
    return STRINGS[lang === "zh" ? "zh" : "en"];
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
      if (v === "en" || v === "zh") {
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
      .card{width:320px; max-height:45vh; background:rgba(20,20,20,.92); border:1px solid rgba(255,255,255,.14); border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.35); overflow:hidden;}
      .head{display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.12); cursor:move; user-select:none;}
      .title{font-weight:700; letter-spacing:.2px;}
      .status{opacity:.85; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
      button{all:unset; cursor:pointer; padding:2px 6px; border-radius:6px; opacity:.9;}
      button:hover{background:rgba(255,255,255,.12);}
      .body{padding:8px 10px; overflow:auto; max-height:calc(45vh - 38px);}
      .row{display:flex; gap:8px; padding:4px 0; border-bottom:1px dashed rgba(255,255,255,.12);}
      .row:last-child{border-bottom:none;}
      .date{min-width:96px; color:#9be7a2; font-weight:700;}
      .date.miss{color:#bdbdbd; font-weight:600;}
      .dom{color:#fff; word-break:break-all;}
      .hint{opacity:.75; padding:6px 0;}
      .min .body{display:none;}
      .min .card{width:240px;}
    `;

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.innerHTML = `
      <div class="card">
        <div class="head" id="head">
          <span class="title" id="title"></span>
          <span class="status" id="status"></span>
          <button id="lang" title=""></button>
          <button id="scope" title=""></button>
          <button id="toggle" title="">–</button>
          <button id="close" title="">×</button>
        </div>
        <div class="body" id="body">
          <div class="hint" id="hint"></div>
        </div>
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
    const langEl = shadow.getElementById("lang");
    const toggleEl = shadow.getElementById("toggle");
    const closeEl = shadow.getElementById("close");

    if (titleEl) titleEl.textContent = S.title;
    if (statusEl) statusEl.textContent = S.scanning;
    if (hintEl) hintEl.textContent = S.collecting;
    if (scopeEl) scopeEl.title = S.scopeTitle;
    if (toggleEl) toggleEl.title = S.minimizeTitle;
    if (closeEl) closeEl.title = S.closeTitle;

    const refreshLangButton = () => {
      if (!langEl) return;
      const current = lang === "zh" ? "zh" : "en";
      langEl.textContent = current === "zh" ? S.langToEn : S.langToZh;
      langEl.title = S.langTitle;
    };
    refreshLangButton();

    closeEl?.addEventListener("click", () => {
      enabled = false;
      host.remove();
    });
    toggleEl?.addEventListener("click", () => wrap.classList.toggle("min"));
    scopeEl?.addEventListener("click", async () => {
      const next = scope === "all" ? "site" : "all";
      await saveScope(next);
      if (panel) panel.setScope(next);
      try {
        document.documentElement.dispatchEvent(new CustomEvent("whois-domain-date-scope-changed"));
      } catch {
        // ignore
      }
    });
    langEl?.addEventListener("click", async () => {
      const next = lang === "zh" ? "en" : "zh";
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
        if (path.some((el) => el && el.tagName === "BUTTON")) return;
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

    panel = {
      root: host,
      statusEl,
      bodyEl,
      scopeEl,
      langEl,
      titleEl,
      hintEl,
      rows: new Map(),
      setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
      },
      setScope(next) {
        const S2 = t();
        if (this.scopeEl) this.scopeEl.textContent = next === "all" ? S2.scopeAll : S2.scopeSite;
        if (this.scopeEl) this.scopeEl.title = S2.scopeTitle;
      },
      setLang(next) {
        const S2 = t();
        if (this.titleEl) this.titleEl.textContent = S2.title;
        if (this.hintEl) this.hintEl.textContent = S2.collecting;
        if (this.langEl) {
          this.langEl.textContent = next === "zh" ? S2.langToEn : S2.langToZh;
          this.langEl.title = S2.langTitle;
        }
        this.setScope(scope);
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
          row.innerHTML = `<span class="date miss" data-date>…</span><span class="dom" data-dom></span>`;
          row.querySelector("[data-dom]").textContent = domain;
          this.bodyEl.appendChild(row);
          this.rows.set(domain, row);
        }
      },
      setDomainValue(domain, value) {
        const S2 = t();
        const row = this.rows.get(domain);
        if (!row) return;
        const dateEl = row.querySelector("[data-date]");
        if (!dateEl) return;
        if (value === undefined) {
          dateEl.textContent = "…";
          dateEl.classList.add("miss");
        } else if (value) {
          dateEl.textContent = value;
          dateEl.classList.remove("miss");
        } else {
          dateEl.textContent = S2.unknown;
          dateEl.classList.add("miss");
        }
      }
    };

    return panel;
  }

  function parseRegistrableDomain(domainOrHost) {
    const raw = String(domainOrHost || "").toLowerCase().replace(/\.+$/g, "");
    if (!raw || raw.includes("..")) return null;

    const labels = raw.split(".");
    if (labels.length < 2) return null;

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
    if (!SINGLE_SUFFIXES.includes(suffix)) return null;
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
    return Date.now() - entry.t < CACHE_TTL_MS;
  }

  async function queryWhois(registrableDomain) {
    const parsed = parseRegistrableDomain(registrableDomain);
    if (!parsed) return null;
    const url = `https://whois.freeaiapi.xyz/?name=${encodeURIComponent(parsed.name)}&suffix=${encodeURIComponent(parsed.suffix)}&c=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.status !== "ok") return null;
    if (!data.creation_datetime) return null;
    return formatCreationDate(data.creation_datetime);
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
        const v = cachedEntry.v || null;
        domainToPrefix.set(domain, v);
        ui.setDomainValue(domain, v);
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
        let prefix = null;
        try {
          prefix = await queryWhois(domain);
        } catch {
          prefix = null;
        }
        cache[domain] = { v: prefix, t: Date.now() };
        cacheChanged = true;
        domainToPrefix.set(domain, prefix);
        ui.setDomainValue(domain, prefix);
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
