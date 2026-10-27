# GitHub Pages 与 Cloudflare DNS 部署

维护：Codex，2026-10-26。源码先上传 GitHub，静态网站由 GitHub Pages 托管，Cloudflare 仅负责域名解析。此架构取代此前 Cloudflare Pages Git 集成建议。

## 发布配置

| 字段 | 值 |
|---|---|
| 源码仓库 | `JiuLaoBenSou/douzuojian` |
| 源码分支 | `main` |
| 本地构建命令 | `npm run build:github` |
| 公开产物 | `releases/github-pages/` |
| Pages 来源 | Deploy from a branch / `gh-pages` / `/` |
| 正式域名 | `douzuojian.com` |
| Node.js | `22.22.3`（`.node-version`） |

项目无第三方依赖，不需要构建密钥。构建包含完整运行代码、对应源码压缩包、原项目署名与许可。prepare-github.mjs 校验白名单发布文件的字节数与 SHA256，生成 `.nojekyll` 和 `CNAME`，后者固定为 douzuojian.com。未列入白名单的文件会阻止准备发布；不复制仓库根目录、研究记录、用户参考图片或 .wrangler。

`npm run build:pages` 保留为通用静态发布打包步骤，并不表示采用 Cloudflare Pages 托管。`_headers` 仅适用于 Cloudflare Pages，prepare-github.mjs 不把它放入 GitHub Pages 产物；不能认为其响应头在本架构已经生效。

发布前运行 npm test、npm run build:github 和 npm run verify。先 fetch 核对远端 gh-pages 是否存在；首次可以创建独立发布分支，后续应在原发布分支基础上正常提交并推送，避免覆盖他人更新。把公开产物放入 gh-pages 根目录。main 保留源码，gh-pages 只发布静态产物，不需要新增 GitHub Actions 工作流或 workflow token 权限。

后续只在用户明确要求上线时推送 gh-pages；本地修改不会自动发布。源码 main 的推送本身不会更新本分支发布的网站。

## 域名解析

先在 GitHub Pages 绑定自定义域，再配置 Cloudflare DNS。只处理 douzuojian.com，保留其他用途的 TXT、MX 等记录，遇到现有网站记录先核对，不重复创建冲突项。

| 类型 | 名称 | 内容 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | jiulaobensou.github.io |

证书验证阶段使用 DNS only；GitHub 证书就绪后开启 Enforce HTTPS。如另需 Cloudflare 代理，验证源站证书后再用 Full (strict)，不使用 Flexible。

## 验收与状态

从 GitHub API 读回 Pages 来源分支、实际构建提交、状态、CNAME 与证书。实测域名首页、JS/CSS/Worker、图纸库、图片转换、PNG/CSV、LICENSE 和 source.zip；核对 HTTP 与 www 跳转，确认内部文件不能公开访问。GitHub 仓库已上传不等于站点已发布。

截至准备本说明时：源码 main 已上传；GitHub Pages 与域名发布状态需依据实际接口结果继续核对。本地构建、云端构建、DNS 与证书状态分别记录，不相互替代。

官方文档：[GitHub 自定义域](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)、[Pages REST API](https://docs.github.com/en/rest/pages/pages)、[Cloudflare DNS 代理状态](https://developers.cloudflare.com/dns/proxy-status/)。
## 保存后的图纸自动同步（2026-10-27 最新用户授权）

用户已改为先发布当前保存版、后续本地校对保存后自动更新。新流程取代上文仅手动明确上线时推送的旧说明；人工后台和原图仍只在本机。

- `node scripts/sync-catalog.mjs --snapshot`：只生成公开数据快照`catalog-content/`，不推送。
- `node scripts/sync-catalog.mjs --deploy --full`：首次完整发布，main源数据先上传、再更新gh-pages并验证。
- `npm run sync:catalog`：对比当前已保存图纸与线上；无差异不部署。
- `node scripts/serve.mjs --dist --port 3045 --local-review docs/batch-gen1-2026-10-27/translation-final --auto-publish`：本地校对服务保存/撤回后自动排队同步。

自动任务从远端main克隆隔离目录，只提交公开图纸文件；不把本地未提交源码自动带上线上。远端变化导致非快进时保留错误并重试，不强推。任务生成的工作目录位于被Git忽略的releases/，不得当作新的项目权威目录。

数据快照规范化精确色号、空格、色数、颗数、分类与缩略图，排除原图/人工日志/绝对路径；有未知格的图暂时保留上一公开版本。相同快照版本不产生新提交。线上catalog/content-version.json记录内容哈希，活动图库每30秒检查一次索引版本，更新后重读数据；不覆盖用户正在工坊编辑的内容。

同步状态保存在.local-review/sync-state.json，失败保留本地修改，校对页提供重试。电脑/服务关闭时不会更新；再次启动会恢复尚未完成的任务。GitHub Pages为静态托管，没有在云端运行校对API。
