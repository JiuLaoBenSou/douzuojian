# GitHub 与 Cloudflare Pages 部署

维护：Codex，2026-10-26。代码先提交到 GitHub，再由 Cloudflare Pages 连接仓库构建，最后绑定 `douzuojian.com`。当前托管连接与正式域名尚待配置；仓库存在不代表网站已上线。

## Pages 配置

| 字段 | 值 |
|---|---|
| GitHub 仓库 | `JiuLaoBenSou/douzuojian` |
| 生产分支 | `main` |
| 框架预设 | None |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build:pages` |
| 输出目录 | `releases/0.3.2` |
| Node.js | `22.22.3`（`.node-version`） |

项目无第三方依赖，不需要密钥。构建从 `src` 和附带的原始上游文件生成页面与对应源码压缩包；发布目录只含公开资源，不应将仓库根目录作为输出目录。

`releases/0.3.2` 来自 package.json 的版本号。升级版本时，同时更新 Pages 的输出目录与本表；正常文案和功能更新可以继续使用当前版本目录。

Cloudflare 首次连接 GitHub 若要求安装应用或增加仓库访问权限，应由账号持有人授权，范围选本仓库。连接成功后，生产分支推送会触发构建和部署；后续本地改动仍需用户明确要求上线后再推送。

## 上线检查

1. 确认 Pages 构建使用目标 Git 提交，并显示成功。
2. 打开 Pages 默认地址，检查图纸库、图片转换、滚轮缩放、PNG/CSV 导出和 `source.zip` 下载。
3. 在项目的自定义域中添加 `douzuojian.com`，等待域名和证书生效。
4. 读回正式域名页面及静态资源，核对部署内容与提交一致。检查 `/LICENSE`、`/source.zip` 与 `/robots.txt`，并确认内部文件不能访问。

不使用手工 ZIP 上传作为此项目的常规部署方式。

官方文档：[Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)、[Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)。
