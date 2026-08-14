# dsh-ssh

> SSH connection plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
> User-configured credentials, command execution on the remote host — credentials never enter the model context.

---

## 功能概览

| 能力 | 描述 |
| --- | --- |
| **凭据管理 UI** | 在 **Settings → Plugins → Configurable → SSH** 卡片里填写 host/username/凭据，所见即所得 |
| **凭据隔离** | 密码、私钥、密钥口令标注 `role('secret')`，跨上下文自动脱敏，模型和 UI 都看不到值 |
| **环境变量兜底** | 未填写的字段自动从 `DSH_SSH_HOST` / `DSH_SSH_PORT` / `DSH_SSH_USERNAME` / `DSH_SSH_PASSWORD` / `DSH_SSH_PRIVATE_KEY` / `DSH_SSH_PASSPHRASE` 读取 |
| **`ssh_exec` 工具** | Agent 调用执行命令，返回 `{exitCode, stdout, stderr, truncated}`，参数不含凭据 |
| **`ssh_disconnect` 工具** | 显式断开（每次执行走短连接，实为 no-op） |
| **超时与中止** | 每条命令可设 `timeoutMs`（默认 60s，上限 24h），支持 `AbortSignal` |
| **输出截断** | 每条流默认 64KB 上限，超过置 `truncated: true` |
| **凭据切换零重启** | 凭据在设置面板保存即生效，下次 `ssh_exec` 自动用新配置 |
| **自动清理** | 插件卸载时关闭所有活动连接 |

---

## 安装

要求：Node.js ≥ 22.12、pnpm（DSH 插件管理器内部调用）、DeepSeek Harness 0.1.0+。

```sh
# 把插件安装到 dsh web profile
npx @deepseek-ai/dsh plugin --profile web add https://github.com/<owner>/dsh-ssh/archive/refs/tags/v0.1.0.tar.gz

# 或从本地源码安装（开发用）
git clone https://github.com/<owner>/dsh-ssh.git
cd dsh-ssh
npx @deepseek-ai/dsh plugin --profile web add "$(pwd)"
```

确认安装：

```sh
npx @deepseek-ai/dsh plugin --profile web list
# 应能看到 dsh-ssh@link:... 或 dsh-ssh@<version>
```

启动 Web UI：

```sh
npx @deepseek-ai/dsh web
# 浏览器打开 http://127.0.0.1:3080
```

---

## 配置

打开 Web UI → **左下角齿轮图标** → **Plugins** → **Configurable** 标签 → 展开 **SSH** 卡片 → 填写字段 → **Save**。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `Host` | 文本 | SSH 服务器地址，例如 `example.com`。空字符串走 `DSH_SSH_HOST` 环境变量，再空则默认 `localhost`。 |
| `Port` | 数字 | SSH 服务器端口，默认 `22`。空字符串走 `DSH_SSH_PORT` 环境变量。 |
| `Username` | 文本 | SSH 登录用户。空字符串走 `DSH_SSH_USERNAME`。 |
| `Password` | 密码框 | SSH 密码。留空保存表示保留原密码（不会清空）。 |
| `Private key` | 密码框 | PEM 编码的私钥原文。留空保存表示保留原私钥。 |
| `Passphrase` | 密码框 | 加密私钥的口令。留空保存表示保留原口令。 |

**凭据优先级**：`ssh_exec` 调用时按以下顺序解析——
1. 卡片保存的字段（非空）
2. 对应 `DSH_SSH_*` 环境变量
3. schema 默认值（仅 host/port）

至少需要 `password` 或 `privateKey` 其中之一，否则 `ssh_exec` 返回 `"ssh: neither password nor private key is set; fill one in the SSH card"`。

**凭据保密机制**：`password`/`privateKey`/`passphrase` 三个字段在 schema 里标 `.role('secret')`——
- 任何 wire 描述（`describe({ redactSecrets: true })`）自动剥离字段值
- 客户端卡片用 `SecretField`，从不在 UI 回显当前值（只显示"已配置"徽标）
- 模型上下文、Agent 工具结果、设置面板读路径都拿不到密码原文

---

## 工具

### `ssh_exec`

执行一条 shell 命令，返回结构化结果。

**参数**（模型可见，**不含凭据**）：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `command` | string | ✓ | — | 在远程主机上运行的 shell 命令 |
| `timeoutMs` | number | ✗ | 60000 | 单条命令超时（毫秒），上限 86 400 000（24h） |
| `maxOutputBytes` | number | ✗ | 64000 | 单流输出上限（字节） |

**返回**：

```ts
{
  exitCode: number | null,   // null 表示被信号或超时终止
  stdout: string,            // 截断后的 stdout（UTF-8 解码）
  stderr: string,            // 截断后的 stderr（UTF-8 解码）
  truncated: boolean         // 任一流超过 maxOutputBytes 时为 true
}
```

**典型用法**（模型侧 prompt 提示）：

```
用 ssh_exec 在远程主机执行 `uname -a`，告诉我内核版本。
```

Agent 会自动调 `ssh_exec({ command: "uname -a" })`，把 stdout 报回用户。

### `ssh_disconnect`

显式断开当前会话（**当前实现为 no-op**：每次 `ssh_exec` 都用一次性短连接，没有持续连接可关闭；保留此工具为未来持久连接预留接口）。

参数：无。返回 `{ disconnected: true }`。

---

## 安全模型

| 数据 | 去向 |
| --- | --- |
| 卡片输入的密码/私钥 | 写入 `$DSH_HOME` 下的 settings 文档（标记 `role('secret')`） |
| 模型上下文 | 永远拿不到凭据原文（schema 字段全部 secret） |
| Agent 工具调用 | 只传 `command`/`timeoutMs`/`maxOutputBytes`，无凭据 |
| 设置面板读路径 | 走 `SettingsScope`，secret 字段在 wire 描述里被剥离 |
| UI 回显 | `SecretField` 控件类型 `type="password"`，永不显示已存值 |
| 凭据在 Node 进程里 | 走 host 端 `ssh2.Client.connect()`，TLS 上传；离开 host 进程即被丢弃 |

---

## 架构

```
┌─────────── Web GUI (client half) ────────────┐
│ Settings → Plugins → Configurable → SSH card │
│   ├─ <ValueField>  host / port / username    │
│   └─ <SecretField> password / key / passphrase │
└────────────────────┬─────────────────────────┘
                     │ wire (strips secrets)
                     ▼
┌─────────── Host (Node) ──────────────────────┐
│ src/index.ts                                  │
│   ├─ settingsSection 'dsh-ssh'                │
│   │     schema: schemastery, role('secret')  │
│   ├─ ctx.ssh : SshManager (Service)           │
│   │     src/ssh.ts                            │
│   │     ├─ resolveFromEnv()  ←── env fallback│
│   │     ├─ exec(command, opts)                │
│   │     │     ssh2.Client per call            │
│   │     └─ collect(chunks, cap)  ←── truncate │
│   ├─ ctx.tools.register(ssh_exec)             │
│   └─ ctx.tools.register(ssh_disconnect)       │
└────────────────────┬─────────────────────────┘
                     │ SSH2 protocol
                     ▼
                remote host
```

### 模块清单

| 文件 | 作用 |
| --- | --- |
| `src/index.ts` | host 插件入口：注册 settings、挂 `ctx.ssh` 服务、注册两个工具 |
| `src/settings.ts` | schemastery schema + namespace 常量 |
| `src/ssh.ts` | `SshManager extends Service`，ssh2.Client 封装；export `collect()` 供单测 |
| `src/tools.ts` | `ssh_exec` / `ssh_disconnect` 的 `defineTool` 定义 |
| `src/invariant.ts` | 空 invariant companion |
| `src/client/index.ts` | client 插件入口：注入 `settings.plugin.item` slot |
| `src/client/card-controller.ts` | 仿 `bash-card-controller.ts`，staged form + SecretField 写路径 |
| `src/client/card.tsx` | `PluginCard` 套 `ValueField` + `SecretField` 组合 |
| `src/client/locales.ts` | zh/en 字典 |
| `cordis.patch.yml` | bundle patch，挂载 host 插件 |
| `build.mjs` | esbuild bundle（host ESM/node + client CJS/browser） |

### 服务接口

```ts
class SshManager extends Service {
  setSource(source: () => ResolvedSshConfig | undefined): void
  exec(command: string, opts?: {
    timeoutMs?: number           // default 60_000, max 86_400_000
    maxOutputBytes?: number      // default 64_000
    signal?: AbortSignal
  }): Promise<{
    exitCode: number | null
    stdout: string
    stderr: string
    truncated: boolean
  }>
  disposeAll(): void
}
```

`SshManager` 作为 cordis Service 注册到 `ctx.ssh`，tools 通过 `ctx.get('ssh').exec(...)` 调用——同 `@deepseek-ai/dsh-shell` 的 `ShellExecutor` 模式。

---

## 开发

```sh
# 克隆（含子依赖）
git clone https://github.com/<owner>/dsh-ssh.git
cd dsh-ssh
pnpm install --config.auto-install-peers=false

# 构建（esbuild 出 host + invariant + client bundle，tsc 在隔离 npm 因 DSH monorepo 包未发布而跳过——把本包放到 deepseek-harness monorepo 内可拿完整 .d.ts）
node build.mjs
```

### 真实连通性测试

1. 准备一台可 SSH 的服务器（`sshd` 默认监听 22）。
2. 在 Web GUI 里填 host/username/密码，点 Save。
3. 新建会话，输入 `用 ssh_exec 执行 hostname`。
4. 期望模型返回远端主机名。

### 故障排查

| 症状 | 原因 | 修复 |
| --- | --- | --- |
| 模型说"ssh: neither password nor private key is set" | 卡片两个凭据字段都为空，且环境变量也没设 | 卡片填 password 或 privateKey |
| 模型说"ssh: username is empty" | username 字段为空，环境变量也没设 | 填 username |
| `ECONNREFUSED` 提示 | 服务器没监听 / 防火墙挡住 / 端口错 | 检查 sshd 是否运行、port 是否对 |
| `ETIMEDOUT` 提示 | TCP 握手超时 | 检查路由、网络可达性 |
| `ENOTFOUND` 提示 | DNS 解析失败 | 检查 host 拼写 |
| 命令长时间无响应 | 命令超时未到、阻塞 I/O | 提高 `timeoutMs`，或发 SIGINT 取消 |
| 卡片不显示 | 插件未加载 | `npx @deepseek-ai/dsh plugin --profile web list` 确认；重启 web server |

---

## 路线图

- [ ] 多目标并行连接池（一个会话连多台主机）
- [ ] 交互式 PTY（持久终端）
- [ ] SFTP 文件上传/下载
- [ ] 跳板（ProxyJump）支持

当前为 v0.1.0：覆盖命令执行（用户最常见需求）。其余功能按需追加。

---

## 协议与许可

- 协议：[MIT](LICENSE)
- 不隶属于 DeepSeek；非官方社区资源
- 灵感来源：[FileTerm](https://github.com/St0ff3l/fileterm) 的 SSH 客户端形态
- 插件协议参考：[dsh-open-in-vscode](https://github.com/omdsh-dev/dsh-open-in-vscode) 的 settings + 凭据模式

---

## 致谢

`SshManager` 参照 `@deepseek-ai/dsh-shell` 的 `ShellExecutor` Service 模式；`SSH Card` 参照 `ui-settings-plugins` 的 `bash-card-controller` / `WebSearchCard` 的 staged form + `SecretField` 写法。
