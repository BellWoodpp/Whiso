# Whois Domain Date Prefix (Chrome extension)

Docs: English (`README.md`) | 日本語 (`README.ja.md`)
UI language: `EN/中文/日本語` (switch in panel)

This extension shows a floating list at the **top-left** with a creation-date prefix like `(2025.03.09)`, domain age, and expiration date (from WHOIS/RDAP). You can switch the scope in the panel:

- `SITE`: only the current website’s main domain (default)
- `ALL`: domains found in page **links/resources** (e.g. `href`/`src`/`action`) and also in **page text**

## Install (Ubuntu / Chrome)

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `whois-domain-date-extension/`

## Use

- Click the extension’s toolbar icon to show/hide the panel for the **current page** (pin it from the puzzle menu if you don’t see it).
- In the panel, use the scope dropdown to switch between `SITE/ALL`.
- Use the language dropdown to switch the panel language (`EN/中文/日本語`).
- Drag the panel header to move it; the position is saved.
- Resize the panel by dragging its edges or the bottom-right corner; the size is saved (separately for `SITE/ALL`).

## Notes

- By default it runs on all websites where extensions are allowed (internal pages like `chrome://...` are excluded by Chrome).
- It queries `https://whois.freeaiapi.xyz/` for WHOIS data (domains found on pages will be sent to that service).
- If the WHOIS service does not support a TLD, it falls back to RDAP via `https://rdap.org/` (which may redirect to the authoritative RDAP server for that TLD).
- To validate TLDs (reduce false positives), it may download the public IANA TLD list from `https://data.iana.org/` and cache it locally.
- The floating list helps on pages where domains only appear in links (not visible text).
- Multi-part suffix support is limited (e.g. `co.uk`, `com.cn` are supported, but not every public suffix).
- If you change the display format and still see old values, reload the extension and it will rebuild its cache.

## Privacy

- Privacy policy (source): `whois-domain-date-extension/PRIVACY.md`
- Privacy policy (public page for Chrome Web Store): publish `whois-domain-date-extension/docs/privacy-policy.html` and use its public URL in the store listing (e.g. GitHub Pages: `https://<user>.github.io/<repo>/privacy-policy.html`)
