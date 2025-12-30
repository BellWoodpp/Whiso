# Instructions for Codex (whois-domain-date-extension)

## First steps (new session)
- Read `docs/CONTEXT.md` and `docs/TODO.md` first, then `README.md`.
- Start with `git status --porcelain=v1` to avoid accidental changes.
- Keep changes minimal and focused; don’t reformat unrelated code.

## 口令（你对我说这些就按流程执行）
- `开工`：读取 `docs/CONTEXT.md`、`docs/TODO.md`、`README.md`、`manifest.json`；用 5~10 行总结当前状态与“下一步最小可验证任务”，然后开始干活。
- `收工`：只做“状态同步”——更新 `docs/CONTEXT.md` 的“当前状态”和 `docs/TODO.md` 的“进行中/下一步”（除非你明确要求改代码），并输出下次 `开工` 的切入点。
- `收尾/同步状态`：同 `收工`。

## Project constraints
- Chrome Extension, Manifest V3 (no bundler/build step assumed).
- Use plain JavaScript (no TypeScript migration unless explicitly requested).
- Keep permissions minimal; if you add permissions, update `README.md` and privacy docs as needed.

## UI/i18n expectations
- Maintain `EN/中文/日本語` support (see `content.js` `STRINGS`).
- Any new UI text must be added for all supported languages.

## Networking/privacy
- If you change any network endpoints or what data is sent, update `PRIVACY.md` and `docs/privacy-policy.html`.
- Prefer graceful failure: timeouts/errors should not break page interaction.
