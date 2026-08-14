/**
 * The SSH card body: three plain fields rendered with `TextField` and
 * three credentials rendered with `PasswordField`. The card does not reuse
 * `PluginCard` because that chrome is keyed to the `settings.plugins`
 * locale namespace; we own a `dsh-ssh` namespace instead. `ValueField` and
 * `SecretField` from `ui-settings-plugins` are internal and not exported
 * from its client entry, so we keep tiny local stand-ins.
 */
import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CardFieldState, SshCardFace } from './card-controller.ts'
import type { SshCardKey } from './locales.ts'

/** Props the renderer binds for the SSH card. */
export type SshCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'dsh-ssh'>
  & InjectFace<SshCardFace>

/** Locale reader bound to our SSH card keys. */
type CardT = (key: SshCardKey) => string

/** Localised chrome copy used by the card's header and footer. */
const CHROME: Record<string, {
  expand: string; collapse: string
  save: string; saving: string; discard: string
  unsaved: string; saveFailed: string; readOnly: string
  overridden: string; reset: string; invalid: string
}> = {
  zh: {
    expand: '展开', collapse: '折叠',
    save: '保存', saving: '保存中…', discard: '放弃',
    unsaved: '有未保存修改', saveFailed: '保存失败，请重试。',
    readOnly: '当前配置不可写。',
    overridden: '已覆盖', reset: '重置', invalid: '请输入有效值',
  },
  en: {
    expand: 'Show settings', collapse: 'Hide settings',
    save: 'Save', saving: 'Saving…', discard: 'Discard',
    unsaved: 'Unsaved', saveFailed: 'Save failed; please retry.',
    readOnly: 'Current configuration is read-only.',
    overridden: 'Overridden', reset: 'Reset', invalid: 'Please enter a valid value',
  },
}

/** Minimal labelled text field. */
function TextField(props: {
  id: string
  label: string
  hint: string
  field: CardFieldState
  disabled: boolean
  onEdit: (text: string) => void
  onReset: () => void
  chrome: typeof CHROME['zh']
}) {
  return (
    <div>
      <div>
        <label htmlFor={props.id}>{props.label}</label>
        {props.field.dirty ? (
          <span>
            <span>{props.chrome.overridden}</span>
            <button type="button" disabled={props.disabled} onClick={props.onReset}>{props.chrome.reset}</button>
          </span>
        ) : null}
      </div>
      <input
        id={props.id}
        type="text"
        value={props.field.text}
        disabled={props.disabled}
        onChange={(e) => { props.onEdit(e.target.value) }}
        aria-invalid={props.field.invalid}
      />
      <p>{props.field.invalid ? props.chrome.invalid : props.hint}</p>
    </div>
  )
}

/** Minimal write-only password field. */
function PasswordField(props: {
  id: string
  label: string
  hint: string
  field: CardFieldState
  stateLabel: string
  disabled: boolean
  onEdit: (text: string) => void
}) {
  return (
    <div>
      <div>
        <label htmlFor={props.id}>{props.label}</label>
        <span>{props.stateLabel}</span>
      </div>
      <input
        id={props.id}
        type="password"
        autoComplete="off"
        value={props.field.text}
        disabled={props.disabled}
        onChange={(e) => { props.onEdit(e.target.value) }}
      />
      <p>{props.hint}</p>
    </div>
  )
}

/** Render the SSH card. */
export function DshSshCard(props: SshCardProps) {
  const t = props.t as unknown as CardT
  const state = props.useSshCard((snapshot: import('./card-controller.ts').SshCardState) => snapshot)
  const disabled = !state.writable
  const [open, setOpen] = useState(false)
  // Pick chrome language by checking a distinct English-only label.
  const isEnglish = t('sshHost') === 'Host'
  const chrome: typeof CHROME['zh'] = isEnglish ? CHROME['en']! : CHROME['zh']!
  if (!state.available) return null
  const blocked = !state.dirty || state.invalid || state.saving
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span>{t('sshTitle')}</span>
        <span>{t('sshDescription')}</span>
        {state.dirty ? <span>{chrome.unsaved}</span> : null}
      </button>
      {open ? (
        <div>
          {!state.writable ? <p role="status">{chrome.readOnly}</p> : null}
          <TextField
            id="plugin-config-ssh-host"
            label={t('sshHost')}
            hint={t('sshHostHint')}
            field={state.host}
            disabled={disabled}
            onEdit={(text) => { props.edit('host', text) }}
            onReset={() => { props.resetField('host') }}
            chrome={chrome}
          />
          <TextField
            id="plugin-config-ssh-port"
            label={t('sshPort')}
            hint={t('sshPortHint')}
            field={state.port}
            disabled={disabled}
            onEdit={(text) => { props.edit('port', text) }}
            onReset={() => { props.resetField('port') }}
            chrome={chrome}
          />
          <TextField
            id="plugin-config-ssh-username"
            label={t('sshUsername')}
            hint={t('sshUsernameHint')}
            field={state.username}
            disabled={disabled}
            onEdit={(text) => { props.edit('username', text) }}
            onReset={() => { props.resetField('username') }}
            chrome={chrome}
          />
          <PasswordField
            id="plugin-config-ssh-password"
            label={t('sshPassword')}
            hint={t('sshPasswordHint')}
            field={state.password}
            stateLabel={t('sshPasswordState')}
            disabled={disabled}
            onEdit={(text) => { props.edit('password', text) }}
          />
          <PasswordField
            id="plugin-config-ssh-private-key"
            label={t('sshPrivateKey')}
            hint={t('sshPrivateKeyHint')}
            field={state.privateKey}
            stateLabel={t('sshPrivateKeyState')}
            disabled={disabled}
            onEdit={(text) => { props.edit('privateKey', text) }}
          />
          <PasswordField
            id="plugin-config-ssh-passphrase"
            label={t('sshPassphrase')}
            hint={t('sshPassphraseHint')}
            field={state.passphrase}
            stateLabel={t('sshPassphraseState')}
            disabled={disabled}
            onEdit={(text) => { props.edit('passphrase', text) }}
          />
          <div>
            {state.failed ? <p role="status">{chrome.saveFailed}</p> : null}
            <button type="button" disabled={!state.dirty || state.saving} onClick={props.onDiscard}>{chrome.discard}</button>
            <button type="button" disabled={blocked} onClick={props.onSave}>{state.saving ? chrome.saving : chrome.save}</button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
