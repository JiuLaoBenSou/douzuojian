# 工坊广告位

Codex，2026-10-28。仅新增一个工坊底部展示位，位置在导出区和本地图片说明之后；不做弹窗、遮挡或定时刷新。

- 账号：`ca-pub-4153958256787466`，广告单元：`4917532094`。
- `src/ads.js` 仅在 `https://douzuojian.com` / `https://www.douzuojian.com`、工坊显示且广告区域接近视口时加载 SDK 并请求一次。哈希路由往返不会重复请求。
- localhost / 127.0.0.1 / IPv6 loopback 只显示占位预览，不请求真实广告；其他域名不展示广告位。
- SDK 加载错误、请求抛错或 `data-ad-status="unfilled"` 时收起外框。填充的广告按 Google 响应式规则显示，不裁切广告内容。
- `src/ads.txt` 随常规构建进入根目录及发布清单。`google-adsense-account` 元信息用于账号识别；SDK 采用用户提供的通用代码地址。
- 关于页说明 Cookie、Google 广告设置与数据使用。底部支持文案不鼓励点击/观看广告。未改 AdSense 后台自动广告配置；若其已开启，后台仍可能添加其他位置。

## 验证

`node --test tests/ads.test.mjs` 使用假浏览器对象验证请求边界、隐藏视图、SPA 单次请求、失败/无填充收起；不调用 Google、不产生测试展示。

本地预览不能证明账号审核、广告填充、收益、Google 抓取 ads.txt 或实机广告尺寸。发布后另行核对这些状态，站长不要点击自己的广告。

GitHub Pages 不使用 `_headers`，本项目该发布路径不会附加本地服务器的 self-only CSP。若以后改用带 CSP 的托管服务，须按 Google 的 strict CSP / nonce 指引配置；当前 Cloudflare 专用 `_headers` 不能直接用来投放广告。不要为此在本地测试中放开任意第三方域名。

## 参考

- [AdSense 计划政策：不得鼓励点击或观看](https://support.google.com/adsense/answer/48182?hl=zh-Hans)
- [广告展示位置政策](https://support.google.com/adsense/answer/1346295?hl=zh-Hans)
- [响应式广告代码](https://support.google.com/adsense/answer/9183460?hl=en)
- [隐私政策披露](https://support.google.com/adsense/answer/1348695?hl=en)
- [AdSense 与 CSP](https://support.google.com/adsense/answer/16283098?hl=en-GB)
