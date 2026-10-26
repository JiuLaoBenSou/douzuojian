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