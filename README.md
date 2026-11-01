<div align="center">

<img src="https://raw.githubusercontent.com/LIghtJUNction/pi-reload/main/assets/logo.svg" alt="Pi Reload logo" width="128" height="128">

# Pi Reload

**让 agent 自己重载 Pi。一个工具，没有多余功能。**

[![npm](https://img.shields.io/npm/v/pi-agent-reload?color=cb3837&label=npm)](https://www.npmjs.com/package/pi-agent-reload)
[![Pi extension](https://img.shields.io/badge/Pi-extension-6366f1)](https://pi.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

修改扩展、技能或提示词之后，直接让 agent 请求 `/reload`。

[安装](#安装) · [使用](#使用) · [工作原理](#工作原理) · [开发与发布](#开发与发布)

</div>

---

## 安装

### 从 GitHub 安装

```sh
pi install git:github.com/LIghtJUNction/pi-reload
```

### 从 npm 安装

```sh
pi install npm:pi-agent-reload
```

**首次安装后，手动执行一次 `/reload`，或重启 Pi。** 插件必须先加载，agent 才能使用它。

<details>
<summary>本地安装或临时试用</summary>

在克隆下来的项目目录中：

```sh
# 持久安装
pi install .

# 仅为一次新会话加载
pi -e ./extensions/reload.ts
```

</details>

## 使用

告诉 agent：

> 调用 reload_runtime，重新加载 Pi。

插件提供一个不需要参数的工具：`reload_runtime`。

- **重载**：扩展、技能、提示词、主题和上下文文件。
- **不做**：重启进程、升级 Pi、安装依赖、监控文件或执行 shell 命令。
- **不自动触发**：由 agent 按需调用。

## 工作原理

使用 Pi 1.4.0 的空闲事件和扩展命令 API：

```text
agent 调用 reload_runtime
          │
          ▼
记录请求，等待 agent_settled
          │
          ▼
显式解析扩展命令 /agent-reload-runtime
          │
          ▼
Pi 处理命令 → await ctx.reload()
          │
          ▼
新运行时加载，旧上下文不再使用
```

工具上下文没有命令专用的 `ctx.reload()`，因此插件使用一个内部命令桥接，不模拟键盘、不操作终端。

必须等到 `agent_settled` 再发送命令，并指定 `expandPromptTemplates: true`：默认发送行为会把 `/命令` 当作普通模型消息，执行中直接解析命令则会被 Pi 的忙碌检查拒绝。Pi 会将空闲事件内发送的命令延后到事件处理结束再执行。多次请求合并为一次；中止当前运行会取消待处理重载。

> **已排队 ≠ 已完成。**
> 工具返回只确认重载请求已记录，以 Pi 实际重载结果为准。agent 必须结束回复，让运行进入空闲状态；继续调用工具不会触发这次重载。需要使用新加载的工具时，等重载完成后再发一条消息。

## 开发与发布

### 本地验证

测试需要 **Node.js 22.18+**，使用 Node 原生 TypeScript 类型擦除能力，无需编译器。

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm test
npm pack --dry-run
```

8 项单元测试覆盖注册、延迟调度、显式命令解析、请求合并、中止取消、等待重载及错误传播。它们模拟 Pi API，不替代真实会话中的交互重载验证。

### 自动发布

GitHub Actions **仅在推送 `v*` 版本标签或手动触发时运行**，不为日常 push / PR 启动 CI。TypeScript 源码由 Pi 直接加载，不需要编译；发布流程会测试、检查包内容，再发布 npm 并创建 GitHub Release。

首次发布前，维护者需要完成 npm 身份配置，详见 [发布指南](RELEASING.md)。

```sh
# 工作区保持干净；本地测试通过后更新版本并创建标签
npm version patch

# 将对应提交和标签一起推送，触发发布
git push --atomic origin main --follow-tags
```

安装后不会在后台自行更新。需要更新时使用 Pi 的包管理命令：

```sh
pi update --extensions
```

标签固定版本不会自动移动到新版。

## License

[MIT](LICENSE)
