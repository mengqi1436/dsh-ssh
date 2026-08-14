/**
 * dsh-ssh client plugin: the browser half that renders the SSH card under
 * Settings → Plugins → Configurable. Mirrors the slot-injection pattern of
 * `packages/client/ui-settings-plugins/src/client/index.ts`.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls ui-settings SlotMap merge and ctx.settingsScope into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the `settings.plugin.item` SlotMap merge so this program can register against it.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots/client'
import { SshCardController, SSH_NS } from './card-controller.ts'
import { DshSshCard } from './card.tsx'
import { NS, en, zh } from './locales.ts'

/** Services required before load. */
export const inject = ['slots', 'locale', 'settingsScope']

/** Companion plugin name; matches the client bundle id. */
export const name = 'dsh-ssh-client'

/**
 * Mount the SSH card into the `settings.plugin.item` slot.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // Register the SSH card's dictionary additions into the shared
  // `settings.plugins` namespace. The merge is idempotent on reload.
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ssh: dictionaries')

  const controller = new SshCardController(
    ctx.settingsScope.bind({ namespace: SSH_NS }),
  )

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'dsh-ssh',
    order: 30,
    locale: NS,
    inject: () => controller.inject(),
  }, DshSshCard))
}
