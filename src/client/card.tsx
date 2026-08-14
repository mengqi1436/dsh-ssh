/**
 * The SSH card body: three plain fields rendered with `ValueField` and
 * three credentials rendered with `SecretField`. Mirrors
 * `packages/client/ui-settings-plugins/src/client/BashCard.tsx` + the
 * secret half of `WebSearchCard.tsx`.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { ValueField, SecretField } from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { PluginCard } from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { SshCardFace, SshCardState } from './card-controller.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { SshCardKey } from './locales.ts'

/** Props the renderer binds for the SSH card. */
export type SshCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.plugins'>
  & InjectFace<SshCardFace>

/** Locale reader bound to our SSH card keys. */
type CardT = (key: SshCardKey) => string

/** Render the SSH card. */
export function DshSshCard(props: SshCardProps) {
  const t = props.t as unknown as CardT
  const state = props.useSshCard((snapshot) => snapshot)
  const disabled = !state.writable
  return (
    <PluginCard
      t={t as never}
      titleKey="sshTitle"
      descriptionKey="sshDescription"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <ValueField
        id="plugin-config-ssh-host"
        label={t('sshHost')}
        hint={t('sshHostHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        disabled={disabled}
        {...state.host}
        onEdit={(text) => { props.edit('host', text) }}
        onReset={() => { props.resetField('host') }}
      />
      <ValueField
        id="plugin-config-ssh-port"
        label={t('sshPort')}
        hint={t('sshPortHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
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
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
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
    </PluginCard>
  )
}
