# pi-agent-reload

只有一个功能：给 Pi agent 提供 `reload_runtime` 工具，请求执行与 `/reload` 相同的运行时重载。

## 安装

在此目录执行：

```sh
pi install .
```

安装后，在已有会话中手动执行一次 `/reload`，或重启 Pi，首次加载插件。
也可以只在新会话临时加载：

```sh
pi -e ./extensions/reload.ts
```

## 使用

告诉 agent：“调用 reload_runtime，重新加载 Pi。”

工具没有参数。重载扩展、技能、提示词、主题和上下文文件，不重启 Pi 进程、不更新 Pi 本体。

## 工作方式与边界

遵循 Pi 1.4.0 官方 `reload-runtime.ts` 示例：

1. 工具通过 `pi.sendUserMessage(..., { deliverAs: "followUp" })` 排队内部命令 `/agent-reload-runtime`。
2. Pi 处理该后续命令时，命令处理器调用 `await ctx.reload()`。
3. 重载后不再使用旧运行时的上下文。

工具上下文没有 `ctx.reload()`，因此需要这个命令桥接。工具返回只表示“已排队”，不代表重载完成；以 Pi 的重载结果为准。工具调用不是同步重载屏障，不要假设同一批中的后续工具已经使用新扩展。

插件不自动重载、不监控文件、不修改设置、不执行 shell 命令。要使用新加载的工具，建议在重载完成后再发一条消息。

## 本地测试

需要 Node.js 22.18+（支持直接加载可擦除类型的 TypeScript）。

```sh
npm install --ignore-scripts --legacy-peer-deps
npm test
```

测试覆盖工具注册、后续命令排队、等待 reload 和失败传播。真实交互重载需要安装后在 Pi 内验证，单元测试不会重载当前会话。
