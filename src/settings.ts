/**
 * Settings schema for the SSH connection: host, port, username, and
 * credentials. Credential fields carry `role('secret')` so the
 * `redactSecrets` walker strips their values from any wire description,
 * which keeps them out of the model context and out of any UI re-render.
 */
// Schemastery's published types don't expose a default export; the runtime
// resolves to a callable namespace either way. A namespace import keeps
// both shapes working under `tsc` and `esbuild`.
import * as zMod from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
const z = (zMod as unknown as { default?: typeof zMod }).default ?? zMod

/** The settings namespace the host plugin owns. */
export const DSH_SSH_NAMESPACE = settingsNamespace('dsh-ssh')

/** Resolved config (schema defaults applied). */
export interface ResolvedSshConfig {
  /** SSH server host. */
  host: string
  /** SSH server port. */
  port: number
  /** SSH username. */
  username: string
  /** Password credential; absent when the user picked key auth. */
  password: string
  /** Private-key credential (PEM text); absent when the user picked password auth. */
  privateKey: string
  /** Optional passphrase for an encrypted private key. */
  passphrase: string
}

/** The schemastery schema; the source of truth for the settings card and the host registration. */
export const SshConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(22),
  username: z.string().default(''),
  // `role('secret')` makes the redactor strip the value from every wire
  // description; the card never echoes a current value either, so absence
  // here does not weaken the no-echo guarantee.
  password: z.string().role('secret'),
  privateKey: z.string().role('secret'),
  passphrase: z.string().role('secret'),
})

/** Fields the card uses as plain ValueField inputs. */
export interface SshPlainFields {
  host: string
  port: number
  username: string
}

/** Credential field names declared in order; addressed by the card's SecretField list. */
export type SshSecretField = 'password' | 'privateKey' | 'passphrase'

/** Every secret field name in declaration order. */
export const SSH_SECRET_FIELDS: readonly SshSecretField[] = ['password', 'privateKey', 'passphrase']
