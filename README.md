# Whois Domain Date Prefix (Chrome extension)

This extension shows a floating list at the **top-left** with a creation-date prefix like `(2025.03.09)` (from WHOIS). You can switch the scope in the panel:

- `SITE`: only the current website’s main domain (default)
- `ALL`: domains found in page **links/resources** (e.g. `href`/`src`/`action`) and also in **page text**

## Install (Ubuntu / Chrome)

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `whois-domain-date-extension/`

## Use

- Click the extension’s toolbar icon to show/hide the panel for the **current page** (pin it from the puzzle menu if you don’t see it).
- In the panel, click `SITE/ALL` to change scope.
- Click `EN/中文` to switch the panel language.
- Drag the panel header to move it; the position is saved.

## Notes

- By default it runs on all websites where extensions are allowed (internal pages like `chrome://...` are excluded by Chrome).
- It queries `https://whois.freeaiapi.xyz/` for WHOIS data (domains found on pages will be sent to that service).
- The floating list helps on pages where domains only appear in links (not visible text).
- Multi-part suffix support is limited (e.g. `co.uk`, `com.cn` are supported, but not every public suffix).
- If you change the display format and still see old values, reload the extension and it will rebuild its cache.

## Privacy

- Privacy policy: `whois-domain-date-extension/PRIVACY.md`
