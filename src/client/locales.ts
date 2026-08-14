/**
 * Locale dictionaries for the SSH card. The card reuses the
 * `settings.plugins` locale namespace that `ui-settings-plugins` ships,
 * so we only add SSH-specific keys to the same dictionary shape.
 */

import type { PluginsSettingsLocaleKey } from '@deepseek-ai/dsh-client-ui-settings-plugins/client'

/** Every locale key the SSH card reads through `t(...)`. */
export type SshCardKey =
  | PluginsSettingsLocaleKey
  | 'sshTitle'
  | 'sshDescription'
  | 'sshHost'
  | 'sshHostHint'
  | 'sshPort'
  | 'sshPortHint'
  | 'sshUsername'
  | 'sshUsernameHint'
  | 'sshPassword'
  | 'sshPasswordHint'
  | 'sshPasswordState'
  | 'sshPrivateKey'
  | 'sshPrivateKeyHint'
  | 'sshPrivateKeyState'
  | 'sshPassphrase'
  | 'sshPassphraseHint'
  | 'sshPassphraseState'

/** Chinese dictionary — product copy. */
export const zh = {
  // Reuse the shell card copy where it overlaps (save/discard/overridden/reset/...).
  bashTitle: 'Shell',
  bashDescription: '本地命令超时与输出上限，所有 shell 工具共用。',
  bashTimeoutMs: '超时（毫秒）',
  bashTimeoutMsHint: '单条命令的最长运行时间。',
  bashMaxOutputBytes: '单流输出上限（字节）',
  bashMaxOutputBytesHint: '截断前保留多少输出。',
  agentLoopTitle: 'Agent Loop',
  agentLoopDescription: 'Agent 循环的边界。',
  webSearchTitle: 'Web Search',
  webSearchDescription: 'Web 搜索的 API Key 与配额。',
  webSearchBaseURL: 'API 基础地址',
  webSearchBaseURLHint: 'OpenAI 兼容端点，留空使用默认值。',
  webSearchMaxUses: '单请求搜索上限',
  webSearchMaxUsesHint: '每次搜索的最大结果数。',
  webSearchApiKey: 'API Key',
  webSearchApiKeyHint: '已配置的 Key 不会回显，留空保存表示不修改。',
  webSearchApiKeyState: '已配置',
  nav: '插件',
  configurableTab: '可配置',
  inventoryTab: '清单',
  pluginCount: '{count} 个插件',
  collapse: '折叠',
  expand: '展开',
  unsaved: '有未保存修改',
  save: '保存',
  saving: '保存中',
  discard: '放弃',
  saveFailed: '保存失败，请重试。',
  readOnly: '当前配置不可写。',
  overridden: '已覆盖',
  reset: '重置',
  invalidNumber: '请输入有效数字',
  sshTitle: 'SSH',
  sshDescription: '用户在此填写 SSH 连接凭据；模型不接触密码或私钥。',
  sshHost: '主机',
  sshHostHint: 'SSH 服务器地址，例如 example.com。',
  sshPort: '端口',
  sshPortHint: '默认 22。',
  sshUsername: '用户名',
  sshUsernameHint: 'SSH 登录用户名。',
  sshPassword: '密码',
  sshPasswordHint: '留空保存表示保留当前密码。',
  sshPasswordState: '已配置',
  sshPrivateKey: '私钥',
  sshPrivateKeyHint: 'PEM 格式私钥原文；留空保存表示保留当前私钥。',
  sshPrivateKeyState: '已配置',
  sshPassphrase: '私钥口令',
  sshPassphraseHint: '加密私钥的口令；留空保存表示保留当前口令。',
  sshPassphraseState: '已配置',
} satisfies Record<SshCardKey, string>

/** English dictionary — mirrors Chinese keys exactly. */
export const en = {
  bashTitle: 'Shell',
  bashDescription: 'Local command timeouts and output caps; shared by every shell tool.',
  bashTimeoutMs: 'Timeout (ms)',
  bashTimeoutMsHint: 'Maximum runtime of one command.',
  bashMaxOutputBytes: 'Per-stream output cap (bytes)',
  bashMaxOutputBytesHint: 'How much output to keep before truncating.',
  agentLoopTitle: 'Agent Loop',
  agentLoopDescription: 'Bounds for the agent loop.',
  webSearchTitle: 'Web Search',
  webSearchDescription: 'API key and quotas for web search.',
  webSearchBaseURL: 'API base URL',
  webSearchBaseURLHint: 'OpenAI-compatible endpoint; blank uses the default.',
  webSearchMaxUses: 'Searches per request',
  webSearchMaxUsesHint: 'Max results returned per search.',
  webSearchApiKey: 'API key',
  webSearchApiKeyHint: 'Configured keys are never echoed; blank saves mean keep current.',
  webSearchApiKeyState: 'Configured',
  nav: 'Plugins',
  configurableTab: 'Configurable',
  inventoryTab: 'Inventory',
  pluginCount: '{count} plugins',
  collapse: 'Collapse',
  expand: 'Expand',
  unsaved: 'Unsaved changes',
  save: 'Save',
  saving: 'Saving',
  discard: 'Discard',
  saveFailed: 'Save failed; please retry.',
  readOnly: 'Current configuration is read-only.',
  overridden: 'Overridden',
  reset: 'Reset',
  invalidNumber: 'Please enter a valid number',
  sshTitle: 'SSH',
  sshDescription: 'SSH connection credentials live here. Passwords and keys never enter the model context.',
  sshHost: 'Host',
  sshHostHint: 'SSH server address, e.g. example.com.',
  sshPort: 'Port',
  sshPortHint: 'Default 22.',
  sshUsername: 'Username',
  sshUsernameHint: 'SSH login user.',
  sshPassword: 'Password',
  sshPasswordHint: 'Leave blank to keep the current password.',
  sshPasswordState: 'Configured',
  sshPrivateKey: 'Private key',
  sshPrivateKeyHint: 'PEM-encoded private key text; blank saves keep the current key.',
  sshPrivateKeyState: 'Configured',
  sshPassphrase: 'Passphrase',
  sshPassphraseHint: 'Passphrase for an encrypted key; blank saves keep the current passphrase.',
  sshPassphraseState: 'Configured',
} satisfies Record<SshCardKey, string>

/** Locale namespace id registered under `ctx.locale`. */
export const NS = 'settings.plugins'
