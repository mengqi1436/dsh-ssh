/**
 * The SSH card body: three plain fields rendered with `ValueField` and
 * three credentials rendered with `SecretField`. The card does not reuse
 * `PluginCard` because that chrome is keyed to the `settings.plugins`
 * locale namespace; we own a `dsh-ssh` namespace instead.
 */
import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ValueField, SecretField } from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { SshCardFace, SshCardState } from './card-controller.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { SshCardKey } from './locales.ts'

/** Props the renderer binds for the SSH card. */
export type SshCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'dsh-ssh'>
  & InjectFace<SshCardFace>

/** Locale reader bound to our SSH card keys. */
type CardT = (key: SshCardKey) => string

/** Localised chrome copy used by the card's header and footer. */
const CHROME: Record<string, { expand: string; collapse: string; save: string; saving: string; discard: string; unsaved: string; saveFailed: string; readOnly: string }> = {
  zh: {
    expand: '展开', collapse: '折叠',
    save: '保存', saving: '保存中…', discard: '放弃',
    unsaved: '有未保存修改', saveFailed: '保存失败，请重试。',
    readOnly: '当前配置不可写。',
  },
  en: {
    expand: 'Show settings', collapse: 'Hide settings',
    save: 'Save', saving: 'Saving…', discard: 'Discard',
    unsaved: 'Unsaved', saveFailed: 'Save failed; please retry.',
    readOnly: 'Current configuration is read-only.',
  },
}

function chromeCopy(locale: 'zh' | 'en'): typeof CHROME['zh'] {
  return CHROME[locale]
}

/** Render the SSH card. */
export function DshSshCard(props: SshCardProps) {
  const t = props.t as unknown as CardT
  const state = props.useSshCard((snapshot) => snapshot)
  const disabled = !state.writable
  const [open, setOpen] = useState(false)
  const chrome = chromeCopy((props.t as unknown as (key: string) => string)('sshTitle') === 'SSH' ? 'en' : 'zh')
  if (!state.available) return null
  const blocked = !state.dirty || state.invalid || state.saving
  return (
    <li className="dsh-ssh-card">
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
          <ValueField
            id="plugin-config-ssh-host"
            label={t('sshHost')}
            hint={t('sshHostHint')}
            overriddenLabel={t('sshHost') === 'Host' ? 'Overridden' : '已覆盖'}
            resetLabel={t('sshHost') === 'Host' ? 'Reset' : '重置'}
            invalidLabel={t('sshHost') === 'Host' ? 'Please enter a valid value' : '请输入有效值'}
            disabled={disabled}
            {...state.host}
            onEdit={(text) => { props.edit('host', text) }}
            onReset={() => { props.resetField('host') }}
          />
          <ValueField
            id="plugin-config-ssh-port"
            label={t('sshPort')}
            hint={t('sshPortHint')}
            overriddenLabel={t('sshPort') === 'Port' ? 'Overridden' : '已覆盖'}
            resetLabel={t('sshPort') === 'Port' ? 'Reset' : '重置'}
            invalidLabel={t('sshPort') === 'Port' ? 'Please enter a valid number' : '请输入有效数字'}
            numeric
            disabled={disabled}
            {...state.port}
            onEdit={(text) => { props.edit('port', text) }}
            onReset={() => { props.resetField('port') }}
          />
          <ValueField
            id="plugin-config-ssh-username"
            label={t('sshUsername')}
            hint={t('sshUsernameHint')}
            overriddenLabel={t('sshUsername') === 'Username' ? 'Overridden' : '已覆盖'}
            resetLabel={t('sshUsername') === 'Username' ? 'Reset' : '重置'}
            invalidLabel={t('sshUsername') === 'Username' ? 'Please enter a valid value' : '请输入有效值'}
            disabled={disabled}
            {...state.username}
            onEdit={(text) => { props.edit('username', text) }}
            onReset={() => { props.resetField('username') }}
          />
          <SecretField
            id="plugin-config-ssh-password"
            label={t('sshPassword')}
            hint={t('sshPasswordHint')}
            configured
            stateLabel={t('sshPasswordState')}
            disabled={disabled}
            {...state.password}
            onEdit={(text) => { props.edit('password', text) }}
          />
          <SecretField
            id="plugin-config-ssh-private-key"
            label={t('sshPrivateKey')}
            hint={t('sshPrivateKeyHint')}
            configured
            stateLabel={t('sshPrivateKeyState')}
            disabled={disabled}
            {...state.privateKey}
            onEdit={(text) => { props.edit('privateKey', text) }}
          />
          <SecretField
            id="plugin-config-ssh-passphrase"
            label={t('sshPassphrase')}
            hint={t('sshPassphraseHint')}
            configured
            stateLabel={t('sshPassphraseState')}
            disabled={disabled}
            {...state.passphrase}
            onEdit={(text) => { props.edit('passphrase', text) }}
          />
          <div>
            {state.failed ? <p role="status">{chrome.saveFailed}</p> : null}
            <button type="button" disabled={!state.dirty || state.saving} onClick={props.onDiscard}>{chrome.discard}</button>
            <button type="button" disabled={blocked} onClick={props.onSave}>{chrome.saving && state.saving ? chrome.saving : chrome.save}</button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
