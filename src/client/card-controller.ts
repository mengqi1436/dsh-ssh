/**
 * Staged form for the SSH card. Mirrors the staged-form pattern used by
 * `ui-settings-plugins`'s internal card-form.ts — writes only happen on
 * Save; drafts are local until committed.
 */
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** Namespace of the SSH card; spelled here because the client cannot import the host. */
export const SSH_NS = 'dsh-ssh'

/** The plain (non-secret) fields this card edits. */
export interface SshPlainFields {
  host: string
  port: number
  username: string
}

/** One field as a card's control renders it. */
export interface CardFieldState {
  /** Draft text the control renders. */
  text: string
  /** Whether the field has an unsaved draft. */
  dirty: boolean
  /** Whether the draft fails schema validation. */
  invalid: boolean
}

/** Form state every plugin card shares. */
export interface CardShell {
  /** False while the namespace is not served to this client; the card renders nothing. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits that a save would write. */
  dirty: boolean
  /** Whether any staged draft is invalid, which blocks the save. */
  invalid: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land as staged; cleared by the next edit or save. */
  failed: boolean
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
export interface SshCardFace {
  hooks: { sshCard: SnapshotStore<SshCardState> }
  edit: (field: string, text: string) => void
  resetField: (field: string) => void
  save: () => void
  discard: () => void
}

interface FieldSpec {
  parse: (text: string) => unknown | undefined
  format: (value: unknown) => string
}

function textField(): FieldSpec {
  return {
    parse: (text) => (text === '' ? undefined : text),
    format: (value) => (typeof value === 'string' ? value : ''),
  }
}

function numberField(): FieldSpec {
  return {
    parse: (text) => {
      const n = Number(text)
      return text === '' ? undefined : Number.isFinite(n) ? n : undefined
    },
    format: (value) => (typeof value === 'number' ? String(value) : ''),
  }
}

const SECRET_FIELDS = ['password', 'privateKey', 'passphrase'] as const

/** A staged form: edits live until Save, then one bulk write to the scope. */
export class SshCardController {
  private readonly store: SnapshotStore<SshCardState>
  private readonly staged = new Map<string, string>()
  private readonly scope: SettingsScope<SshPlainFields>
  private saving = false
  private failed = false

  private readonly specs: Record<string, FieldSpec> = {
    host: textField(),
    port: numberField(),
    username: textField(),
    password: textField(),
    privateKey: textField(),
    passphrase: textField(),
  }

  constructor(scope: SettingsScope<SshPlainFields>) {
    this.scope = scope
    this.store = createSnapshotStore(this.projection())
    scope.subscribe(() => { this.store.set(this.projection()) })
  }

  /** Read the form's current state. */
  private projection(): SshCardState {
    const snapshot = this.scope.getSnapshot()
    const value = (snapshot.value ?? {}) as Record<string, unknown>
    const dirty = this.staged.size > 0
    let invalid = false
    const fields: Record<string, CardFieldState> = {}
    for (const [name, spec] of Object.entries(this.specs)) {
      const draft = this.staged.get(name)
      const text = draft ?? spec.format(value[name])
      const parsed = spec.parse(text)
      const fieldInvalid = text !== '' && parsed === undefined
      if (fieldInvalid) invalid = true
      fields[name] = { text, dirty: draft !== undefined && draft !== spec.format(value[name]), invalid: fieldInvalid }
    }
    return {
      available: snapshot.available !== false,
      writable: snapshot.writable !== false,
      dirty,
      invalid,
      saving: this.saving,
      failed: this.failed,
      host: fields.host!,
      port: fields.port!,
      username: fields.username!,
      password: fields.password!,
      privateKey: fields.privateKey!,
      passphrase: fields.passphrase!,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  /** Face the card's slot registration injects. */
  inject(): SshCardFace {
    return {
      hooks: { sshCard: this.store },
      edit: (field, text) => {
        if (!(field in this.specs)) throw new Error(`dsh-ssh: no field ${field}`)
        this.staged.set(field, text)
        this.failed = false
        this.publish()
      },
      resetField: (field) => {
        this.staged.delete(field)
        this.publish()
      },
      save: () => {
        if (this.staged.size === 0 || this.saving) return
        const draft: Record<string, unknown> = {}
        for (const [field, text] of this.staged) {
          const spec = this.specs[field]
          if (spec === undefined) continue
          const parsed = spec.parse(text)
          if (parsed === undefined) {
            // Empty draft means "clear"; a non-empty unparsable draft is
            // rejected before save by the invalid flag.
            continue
          }
          draft[field] = parsed
        }
        this.saving = true
        this.failed = false
        this.publish()
        const plain: Partial<SshPlainFields> = {}
        const secrets: Record<string, string> = {}
        for (const [field, value] of Object.entries(draft)) {
          if ((SECRET_FIELDS as readonly string[]).includes(field)) secrets[field] = String(value)
          else (plain as Record<string, unknown>)[field] = value
        }
        // Plain fields go through the section update; secrets go through
        // the credentials plane (write-only).
        const writes: Promise<void>[] = []
        if (Object.keys(plain).length > 0) writes.push(this.scope.update(plain))
        for (const [field, value] of Object.entries(secrets)) {
          writes.push(this.scope.update({ [field]: value } as Partial<SshPlainFields>))
        }
        void Promise.all(writes).then(() => {
          this.saving = false
          this.staged.clear()
          this.publish()
        }, () => {
          this.saving = false
          this.failed = true
          this.publish()
        })
      },
      discard: () => {
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }
}
