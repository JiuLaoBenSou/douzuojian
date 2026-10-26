# 豆作间｜拼豆图案与制作助手

维护与修改：Codex，2026-10-26。v0.3.2 官网引导版，已部署至 GitHub Pages：[douzuojian.com](https://douzuojian.com/)。

部署方式：源码保存在 GitHub 的 main 分支，网站由 GitHub Pages 发布 gh-pages 分支，Cloudflare 管理 douzuojian.com 的 DNS。配置见 [部署说明](docs/DEPLOYMENT.md)。

中文用户的拼豆图案与制作助手。采用用户指定的像素动漫风：天空蓝、薄荷绿、奶油黄，方角像素窗框、硬阴影、独立 AI 浮岛插画。

## 现在能做什么

- 图案小站：4 张豆作间原创 16×16 几何图，搜索/分类、真实颗数、一键进入工坊。
- 图片转图纸：JPG/PNG/WebP，最大 12 MB、2000 万像素；先缩到最长边 1024px，在浏览器 Worker 内转换。图案宽高可按1格输入，单边1–128格，可锁定原图比例；板型与图案格数分开设置，支持26/29/50/52/57/78/104针与自定义板型。
- 配色：MARD 291 条上游参考映射，颜色上限 2–24，可选主导色/平均色，按手边色号限定可用色。不是官方当前色卡或实物校准结果。
- 精修：完整色板补色、画笔、橡皮、连续落笔与每笔撤销（20笔）；四边坐标、逐格色号、5/10格辅助线、独立板缝、清晰读图和拖动平移；用量随修改同步，空白格不计豆。
- 导出：带完整四边坐标/色号/底部每色用量/总数的 PNG、UTF-8 BOM CSV。PNG 是参考图，不是校准的 1:1 拼板打印模板。
- 烫豆手册：入门准备、品牌/尺寸说明、翘边与粘纸；附厂商原文链接、资料日期和适用边界，未进行本站实物烫豆实验。
- 关于、原项目致谢、完整 LICENSE、本版本对应源码下载。

图片在当前浏览器中处理，无图片上传接口、账号、云存储、埋点或广告。刷新会清空当前编辑，请先导出。

## 启动

Node.js 22.18+；零第三方运行依赖，无需 npm install。

```powershell
Set-Location -LiteralPath 'F:\vibe coding\project\bead-pattern-studio'
npm.cmd start
# 打开终端给出的 http://127.0.0.1:<port>；Ctrl+C 关闭
```

默认随机端口、仅本机访问，也可 `npm.cmd start -- --port 5173`。`npm run build` 生成 dist 和对应源码包；`npm run preview` 预览已构建文件；`npm test` 运行核心测试；`npm run verify` 检查计数、许可/色表字节一致、构建/HTTP/私有路径边界和临时服务关闭。

## 基于开源项目改进

基于 [Zippland/perler-beads](https://github.com/Zippland/perler-beads) 的固定提交 `2efee730f73dd4eb472ebde443a022d11f98bc21`，保留 Zippland 及贡献者的版权、AGPL-3.0 和原中文声明。已移植其像素化/Oklab 配色、单格编辑与统计核心，并接入上游 MARD 参考映射。完整原样快照保持不动，未安装/运行上游 Next.js 应用和依赖树。

修改后的 JS 可通过 `node scripts/prepare-upstream.mjs` 从所附原 TypeScript 复现。新增中文界面、原创图案、Worker、颜色限制、导出与手册由 Codex 于 2026-10-25 完成。详见 [第三方声明](THIRD-PARTY-NOTICES.md)、[修改记录](docs/UPSTREAM-CHANGES.md)、[源码构建说明](README-SOURCE.md)。静态应用 `/source.zip` 提供本版本必要源文件与构建脚本，排除内部研究证据和用户图片。

## 图纸与资料

- [图纸接入格式](docs/CATALOG.md)
- [上游修改记录](docs/UPSTREAM-CHANGES.md)
- [部署说明](docs/DEPLOYMENT.md)

内部研究记录、用户参考图片和测试截图留在本地，不随仓库发布。

名称网页排查未见明确同名，不等于商标/域名可用。厂商色卡/实物对应、手机真机下载、实际打印与实拼效果仍待验证。免费/广告方向尚无收入或市场验证结论。

图纸改进依据：[拼豆板规格与参考图细节](docs/PEGBOARD-RESEARCH.md)。上述基础图纸改进已接入v0.2.0，见 docs/CHART-REVISION-2026-10-25.md；1:1打印、独立分板文件与实物验证仍待做。

当前读图缩放为鼠标滚轮连续缩放（1%–3200%），以鼠标位置为锚点；支持输入任意百分比、加减、100%和适应全图。所有放豆格始终绘制色号，不再按倍率自动隐藏。详见 docs/CONTINUOUS-ZOOM-2026-10-25.md。

2026-10-26：新增现成图纸列表/详情和组合检索；换板默认自动适配生成，可关闭保留多板尺寸；屏幕读图改为SVG矢量字形，PNG仍独立绘制。接入新图纸见docs/CATALOG.md。

2026-10-26 v0.3.1：全站用户文案精简；移除内部实现叙述和装饰性准备状态，保留操作后果、参考范围及许可署名。仅本地修改，未发布。

2026-10-26 v0.3.2：用户已购买douzuojian.com并授权部署。导出图纸与CSV加入官网引导，示例署名改为豆作间。npm run build && npm run release生成公开白名单发布目录；本轮因CLI缺Pages/DNS权限及浏览器控制安全终止，部署尚未完成。
