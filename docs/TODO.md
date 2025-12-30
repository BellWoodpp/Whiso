# TODO / Backlog

## 进行中（In Progress）
- 发布准备：验证面板新 UI/交互，并在 CWS 上传 `whois-domain-date-extension-0.1.6.zip`

## 收工清单（End Of Session）
- 把“本次完成/未完成/下一步”同步到 `docs/CONTEXT.md` 的“当前状态”
- 更新本文件的 “进行中/下一步”
- 打包：运行 `scripts/package.sh` 生成 `whois-domain-date-extension-<version>.zip`
- 如涉及网络/数据：同步更新 `PRIVACY.md` 与 `docs/privacy-policy.html`

## 下一步（Next）
- 本地验证：下拉切换（语言/范围）、缩放（四边/右下角）、`全部` 自动扩展、到期日期显示。
- 首次默认尺寸验证：清除扩展存储或卸载重装后，确认初始宽高为 `600x100`。
- 上传：在 Chrome Web Store 后台上传 `whois-domain-date-extension-0.1.6.zip`（注意版本号必须递增；用 `scripts/package.sh` 生成）。
- Chrome Web Store：在商店后台补充日语的“商店详情页长描述/截图/支持信息”（`_locales` 不会自动同步到商店长描述）。
- 清理/整理工作区改动：确认哪些文件应提交、哪些应忽略（例如打包产物 `.zip`）。
- 增补/校验 Public Suffix 支持范围（当前仅内置少量 `SINGLE_SUFFIXES`/`MULTI_SUFFIXES`，并会拉取 IANA TLD 列表）。
- 对 WHOIS/RDAP 异常与超时做更明确的 UI 提示（例如重试、降级说明）。

## 以后再说（Later）
- 面板：增加筛选/搜索、复制域名、导出列表。
- 选项页：配置缓存 TTL、默认范围、默认语言。
- 扫描性能：对 `ALL` 范围增加节流/批处理，减少页面大 DOM 的开销。
