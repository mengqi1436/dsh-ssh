/**
 * Host plugin entry for `dsh-ssh`: registers the SSH settings namespace,
 * mounts the `SshManager` service at `ctx.ssh`, and registers the two tools.
 * The settings document is the only credential store; tools never see
 * passwords or private keys.
 */
import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection } from '@deepseek-ai/dsh-settings'
import { DSH_SSH_NAMESPACE, SshConfigSchema, type ResolvedSshConfig } from './settings.ts'
import { SshManager } from './ssh.ts'
import { registerTools } from './tools.ts'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-ssh'

/** Services required before load. */
export const inject = ['settings', 'tools']

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** SSH manager service mounted by `dsh-ssh`. */
    ssh: SshManager
  }
}

/**
 * Wire the SSH card and the SSH service together.
 * @param ctx - host cordis context.
 */
export function apply(ctx: Context): void {
  const manager = new SshManager(ctx)
  registerTools(ctx)

  installSettingsSection(ctx, DSH_SSH_NAMESPACE, SshConfigSchema, {} as Partial<ResolvedSshConfig>, {
    setSource: (current) => {
      manager.setSource(current as () => ResolvedSshConfig | undefined)
    },
    onChange: () => {
      // The next exec will read the new config; nothing to rebuild here
      // because each command spins a short-lived client.
    },
  })

  ctx.effect(() => {
    manager.disposeAll()
    return () => { manager.disposeAll() }
  }, 'dsh-ssh: dispose active clients')
}

export { SshManager } from './ssh.ts'
export { DSH_SSH_NAMESPACE, SshConfigSchema, SSH_SECRET_FIELDS } from './settings.ts'
export type { ResolvedSshConfig } from './settings.ts'
export type { SshExecResult } from './ssh.ts'
