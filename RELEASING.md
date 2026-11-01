# 发布指南

## 身份授权

当前项目的发布流程支持两种方式：

- **首次发布或兼容方式**：在仓库 Settings → Secrets and variables → Actions 中添加 `NPM_TOKEN`。使用有此包发布权限、有效且符合账号双重验证要求的 npm granular access token。不要提交 token，也不要在聊天中粘贴。
- **后续推荐方式**：包首次发布成功后，在 npm 包设置中配置 Trusted Publisher：GitHub owner 为 `LIghtJUNction`，repository 为 `pi-reload`，workflow filename 为 `release.yml`，不填写 environment。配置完成后可移除仓库 `NPM_TOKEN`，由 GitHub OIDC 短期身份发布。

Trusted Publisher 需要先存在 npm 包；不能用尚未创建的包完成首次授权。包名是否可用及首次发布权限最终以 npm 注册表响应为准。

工作流使用 Node.js 24 和 npm 11.5.1+，授予 `id-token: write`，并通过 `--provenance` 附带构建来源证明。仓库为公开仓库，包也以公开方式发布。

## 发布

1. 本机执行 `npm ci --ignore-scripts --legacy-peer-deps && npm test && npm pack --dry-run`。
2. 确认工作区干净，执行 `npm version patch`（或明确指定版本）。
3. 执行 `git push --atomic origin main --follow-tags`。
4. 工作流验证标签与 package.json 版本一致，然后发布 npm、创建 GitHub Release。
5. 核对 npm 注册表版本、GitHub Release 及远端提交；不要把“已推送”视为“已发布”。

日常 push 和 PR 不触发工作流。首次发布可在已经提交并推送 0.1.0 的代码后创建 `v0.1.0` 标签。

## 重试与已发布版本

在 GitHub Actions 页面选择 Release → Run workflow，ref 选择对应的版本标签，不能选择 main。也可重跑失败的发布工作流。

若相同版本已存在，流程会比较注册表的 integrity 与本次打包文件：内容相同则跳过 npm 发布，继续 GitHub Release；不同则失败，要求检查来源或使用新版本。npm 不允许覆盖既有版本。

自动发布不会修改源码或替你升级依赖，也不会自动给用户安装新版。
