# Security Policy

## Supported version

Source to Slides 目前处于本地 MVP 阶段，只维护 `main` 分支的最新版本。仓库不承诺旧提交或分支仍能获得安全更新。

## Reporting a vulnerability

请不要通过公开 Issue 披露漏洞、密钥或可利用细节。使用仓库 **Security** 页面中的 **Report a vulnerability** 私密提交报告：

https://github.com/702129770-lgtm/source-to-slides/security/advisories/new

报告中请包含受影响版本、复现步骤、影响范围和建议修复方式。维护者确认问题后会在公开修复前协调披露时间。

## Deployment boundary

当前项目面向本地单用户试用，不具备身份验证、租户隔离、请求限流、持久化审计或自动数据清理能力。不要未经额外加固直接部署为多人公网服务，也不要上传未获授权的机密、个人敏感或受监管资料。

## Known dependency advisory

截至 2026-08-14，`pnpm audit --audit-level high` 会报告 PptxGenJS 间接依赖 `image-size@1.2.1` 的两条高等级拒绝服务公告：`GHSA-w3rx-r6r6-pgpr` 与 `GHSA-5p2g-fcmc-qvqq`。

- 公告影响 ICNS、JXL 与 HEIF 解析器；本项目不接收或解析这些格式，浏览器界面只允许 PNG、JPEG 与 WEBP。
- PptxGenJS 在其浏览器构建声明中排除了 `image-size`，当前生产包也未包含这些解析器；服务端不会调用该依赖。
- 公告要求 `image-size >= 2.0.3`，但 npm registry 当前最新版本仍为 `2.0.2`，因此没有可安装的上游修复版。

该提示未被隐藏或伪装为已修复。Dependabot 会持续跟踪上游版本；一旦出现兼容补丁，应重新安装、复跑完整验证并移除此例外说明。
