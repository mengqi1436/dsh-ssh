/**
 * Staged form for the SSH card. Mirrors `bash-card-controller.ts`: three
 * plain fields (host/port/username) round-trip through the settings
 * document, three credential fields write through a write-only path that
 * never echoes the stored value.
 */
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import {
  CardForm, numberField, textField,
  type CardActions, type CardFieldSpec, type CardFieldState, type CardSecretSpec, type CardShell,
} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'

/** Namespace of the SSH card; spelled here because the client cannot import the host. */
export const SSH_NS = 'dsh-ssh'

/** The plain (non-secret) fields this card edits. */
export interface SshPlainFields {
  host: string
  port: number
  username: string
}

/** Secret field names declared in order. */
export const SECRET_FIELDS = ['password', 'privateKey', 'passphrase'] as const

/** Secret field spec for a write-only credential. */
function secretField(field: string, write: (text: string) => Promise<boolean>): CardSecretSpec {
  return { field, write }
}

/** What the SSH card renders. */
export interface SshCardState extends CardShell {
  host: CardFieldState
  port: CardFieldState
  username: CardFieldState
  password: CardFieldState
  privateKey: CardFieldState
  passphrase: CardFieldState
}

/** The face the card's slot registration injects. */
export interface SshCardFace extends CardActions {
  hooks: {
    sshCard: SnapshotStore<SshCardState>
  }
}

/** Bridges the `dsh-ssh` settings scope onto the card's staged form. */
export class SshCardController {
  private readonly form: CardForm<SshPlainFields>
  private readonly store: SnapshotStore<SshCardState>

  /** @param scope - the bound settings scope for the `dsh-ssh` namespace. */
  constructor(scope: SettingsScope<SshPlainFields>) {
    const plainSpecs: CardFieldSpec[] = [
      textField('host'),
      numberField('port'),
      textField('username'),
    ]
    const secretSpecs: CardSecretSpec[] = [
      secretField('password', async (text) => { await scope.update({ password: text }); return true }),
      secretField('privateKey', async (text) => { await scope.update({ privateKey: text }); return true }),
      secretField('passphrase', async (text) => { await scope.update({ passphrase: text }); return true }),
    ]
    this.form = new CardForm(scope, plainSpecs, secretSpecs)
    this.store = this.form.bind(() => this.projection())
  }

  private projection(): SshCardState {
    return {
      ...this.form.shell(),
      host: this.form.field('host'),
      port: this.form.field('port'),
      username: this.form.field('username'),
      password: this.form.field('password'),
      privateKey: this.form.field('privateKey'),
      passphrase: this.form.field('passphrase'),
    }
  }

  /** Build the face the card's slot registration injects. */
  inject(): SshCardFace {
    return { hooks: { sshCard: this.store }, ...this.form.actions() }
  }
}
