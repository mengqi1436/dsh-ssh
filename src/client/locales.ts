/**
 * Locale dictionaries for the SSH card. Lives in its own `dsh-ssh`
 * namespace — `settings.plugins` is already registered by
 * `ui-settings-plugins`, and re-registering it would collide.
 */

/** Every locale key the SSH card reads through `t(...)`. */
export type SshCardKey =
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
export const NS = 'dsh-ssh'

// Merge into the locale namespace map so `PropsLocale<'dsh-ssh'>` and
// `ctx.locale.bind('dsh-ssh')` resolve to the SSH key union.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The SSH card's own namespace. */
    'dsh-ssh': SshCardKey
  }
}
