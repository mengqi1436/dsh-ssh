/**
 * Tool registrations: `ssh_exec` runs a command on the user-configured SSH
 * server; `ssh_disconnect` is a no-op stub kept for symmetry (each tool call
 * already spins its own short-lived client, so there is nothing to close).
 *
 * The tools carry no credential parameters; secrets stay in the settings
 * document and never reach the model context.
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { DEFAULT_MAX_OUTPUT_BYTES, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS } from './ssh.ts'

/** Register the two tools on `ctx.tools`. */
export function registerTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'ssh_exec',
    description:
      'Run a shell command on the user-configured SSH server and return ' +
      '{exitCode, stdout, stderr}. The remote host, credentials, and ' +
      'output cap are managed by the user in Settings → Plugins → SSH; ' +
      'this tool never receives secrets. Output longer than the configured ' +
      'cap is truncated and the truncated flag is set.',
    parameters: {
      command: { type: 'string', required: true, description: 'The shell command to run on the remote host.' },
      timeoutMs: {
        type: 'number',
        description: `Per-command timeout in milliseconds. Defaults to ${DEFAULT_TIMEOUT_MS}; capped at ${MAX_TIMEOUT_MS}.`,
      },
      maxOutputBytes: {
        type: 'number',
        description: `Per-stream output cap in bytes. Defaults to ${DEFAULT_MAX_OUTPUT_BYTES}.`,
      },
    },
    output: {
      // DSH value schema DSL: required is a per-property `required: true`
      // marker (not a JSON-Schema `required: [...]` array on the object).
      // `oneOf` represents exitCode's number | null union.
      schema: {
        type: 'object',
        properties: {
          exitCode: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
          stdout: { type: 'string', required: true },
          stderr: { type: 'string', required: true },
          truncated: { type: 'boolean', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const ssh = ctx.get('ssh') as { exec: (cmd: string, opts: { timeoutMs?: number; maxOutputBytes?: number; signal?: AbortSignal }) => Promise<{ exitCode: number | null; stdout: string; stderr: string; truncated: boolean }> }
      return ssh.exec(args.command, {
        ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
        ...(args.maxOutputBytes !== undefined ? { maxOutputBytes: args.maxOutputBytes } : {}),
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'ssh_disconnect',
    description:
      'No-op for parity: every ssh_exec call uses a short-lived client, ' +
      'so there is no persistent connection to close. Calling it just ' +
      'acknowledges the caller has finished a remote session.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        properties: { disconnected: { type: 'boolean', const: true, required: true } },
        additionalProperties: false,
      },
      render: () => [{ type: 'text', text: '{"disconnected":true}' }],
    },
    async execute() {
      return { disconnected: true }
    },
  }))
}
