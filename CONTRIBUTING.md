# Contributing to GZL PPT

感谢你愿意改进 GZL PPT。为了让问题和合并请求更容易复现、审阅与维护，请遵循下面的流程。

## 开始之前

- 搜索现有 Issues，避免重复提交。
- Bug 请提供最小复现步骤、预期结果、实际结果和运行环境。
- 新功能请先说明使用场景、目标用户和为什么现有流程无法满足。
- 安全问题不要创建公开 Issue，请按照 [SECURITY.md](SECURITY.md) 私密报告。

## 本地开发

需要 Node.js 20.19 或更高版本，以及 pnpm 11。

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

在提交前运行：

```bash
pnpm test
pnpm lint
pnpm build
```

## 提交合并请求

1. 从 `main` 创建范围明确的分支。
2. 只提交与当前改动相关的文件。
3. 补充或更新能够覆盖行为变化的测试。
4. 在合并请求中说明改动、原因、用户影响和验证方式。
5. 保持提交信息简洁，例如 `fix: preserve source labels`。

提交贡献即表示你同意按照本项目的 [Apache License 2.0](LICENSE) 授权该贡献。
