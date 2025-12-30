# 项目上下文 / Project Context

## 这是什么
- 项目：`whois-domain-date-extension`（Chrome 扩展，Manifest V3）
- 功能：在页面左上角浮动面板显示域名的创建日期前缀（来自 WHOIS / RDAP），支持 `SITE`（仅当前站点主域名）与 `ALL`（页面链接/资源/文本中出现的域名）两种范围。
- UI 语言：`EN/中文/日本語`

## 如何在新会话继续（给 Codex / AI）
1. 先读：`docs/CONTEXT.md`、`docs/TODO.md`、`README.md`、`manifest.json`。
2. 用 5~10 行总结：当前目标、已完成、未完成、下一步最小任务。
3. 开始实现前先跑一次：`git status --porcelain=v1`，避免误改/误删。
4. 口令：用户说 `开工` 时，按 1~3 执行后从 `docs/TODO.md` 的“进行中/下一步”开始做最小可验证任务。
5. 口令：用户说 `收工`（或“收尾/同步状态”）时：
   - 仅做“状态同步” + “打包产物生成”（不默认改动其他功能代码）。
   - 更新：`docs/TODO.md` 与本文件的“当前状态”（完成/未完成/下一步）。
   - 打包：运行 `scripts/package.sh` 生成 `whois-domain-date-extension-<version>.zip`（版本号来自 `manifest.json`）。

## 关键文件与职责
- `manifest.json`：扩展元信息（MV3、权限等）。
- `background.js`：点击扩展按钮时注入/切换面板（`chrome.scripting.executeScript` + `chrome.tabs.sendMessage`）。
- `content.js`：主要逻辑（扫描域名、缓存、请求 WHOIS/RDAP、渲染面板、拖拽位置、语言/范围切换）。
- `PRIVACY.md`：隐私政策（源码）。
- `docs/privacy-policy.html`：Chrome Web Store 可发布的隐私政策页面。

## 外部依赖/网络请求
- WHOIS：`https://whois.freeaiapi.xyz/?name=<name>&suffix=<suffix>&c=1`
- RDAP fallback：`https://rdap.org/domain/<domain>`
- IANA TLD 列表：`https://data.iana.org/TLD/tlds-alpha-by-domain.txt`

## 本地存储键（`chrome.storage.local`）
（见 `content.js` 顶部常量）
- 缓存：`whois_domain_date_cache_v3`（有 TTL）
- TLD 列表：`whois_domain_date_tld_list_v1`（有 TTL）
- 范围：`whois_domain_date_scope_v1`
- 面板位置：`whois_domain_date_panel_pos_v1`
- 面板尺寸（本站/全部）：`whois_domain_date_panel_size_site_v1` / `whois_domain_date_panel_size_all_v1`
- 面板语言：`whois_domain_date_panel_lang_v1`

## 当前状态（每次做完事请更新这里）
- 当前目标：完成面板 UI/交互升级（注册/持续/到期信息、下拉切换、可缩放），并打包上传新版本（当前 `0.1.6`）。
- 最近完成：
  - 面板列表：改为两行布局（标题一行、值一行），展示「注册域名 / 域名 / 域名持续时间 / 域名到期时间」。
  - 语言/范围：从按钮切换改为下拉框（`EN/中文/日本語` + `本站/全部`）。
  - 可缩放：支持右下角与四边拖拽缩放；并按 `本站/全部` 分别记忆尺寸；`全部` 结果变多时会自动扩展高度（有上限）。
  - 默认尺寸：首次安装（未保存过尺寸）默认宽度调到 `600`，高度为 `100`。
  - 文档：`README.md` / `README.ja.md` 已同步下拉切换与缩放说明。
  - 打包：新增 `scripts/package.sh`；本次已生成上传包 `whois-domain-date-extension-0.1.6.zip`。
- 正在进行：发布准备（本地验证 + CWS 上传）。
- 下一步（最小可验证）：
  - 本地加载未打包扩展，验证：下拉切换、缩放/记忆、`全部` 自动扩展、到期日期展示正常。
  - 验证“首次默认尺寸”：需要清除扩展存储或卸载重装，确认初始宽高为 `600x100`。
  - 若 Chrome Web Store 已存在 `0.1.6`：先递增 `manifest.json` 的 `version` 再运行 `scripts/package.sh` 生成新包；否则可直接上传 `whois-domain-date-extension-0.1.6.zip`。
- 已知问题/边界：Public Suffix 支持仍为“内置少量 + IANA TLD”组合（不等同 PSL）；`ALL` 范围在超大页面可能有性能开销。
- 发布/打包备注：发布前确保 `manifest.json` 版本号递增，并用 `scripts/package.sh` 重新打包；仓库内 `.zip` 产物默认已被 `.gitignore` 忽略。
