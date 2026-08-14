/**
 * Host-side SSH service. Hosts an `ssh2.Client` keyed on the user-configured
 * credentials; reconnects when the settings document moves; collects stdout
 * and stderr from one `exec` call into a bounded pair of strings.
 *
 * `SshManager` is a cordis Service mounted at `ctx.ssh`; tools reach it
 * through `ctx.get('ssh')`, the same shape `@deepseek-ai/dsh-shell`'s
 * `ShellExecutor` uses.
 */
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import type { ResolvedSshConfig } from './settings.ts'

/** Default per-stream output cap in bytes; matches `bash-local`'s `maxOutputBytes`. */
export const DEFAULT_MAX_OUTPUT_BYTES = 64_000

/** Default per-command timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 60_000

/** Maximum allowed per-command timeout (timer cap). */
export const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000

/** Result of one remote command. */
export interface SshExecResult {
  /** Process exit code (null when killed by signal or timeout). */
  exitCode: number | null
  /** Collected stdout text, truncated at the configured cap. */
  stdout: string
  /** Collected stderr text, truncated at the configured cap. */
  stderr: string
  /** Whether either stream was truncated to fit the cap. */
  truncated: boolean
}

/** Resolve host/port/username/credentials from config, falling back to environment variables. */
export function resolveFromEnv(config: ResolvedSshConfig, env: NodeJS.ProcessEnv = process.env): ResolvedSshConfig {
  const host = config.host || env.DSH_SSH_HOST || 'localhost'
  const port = config.port || Number.parseInt(env.DSH_SSH_PORT ?? '', 10) || 22
  const username = config.username || env.DSH_SSH_USERNAME || ''
  const password = config.password || env.DSH_SSH_PASSWORD || ''
  const privateKey = config.privateKey || env.DSH_SSH_PRIVATE_KEY || ''
  const passphrase = config.passphrase || env.DSH_SSH_PASSPHRASE || ''
  return { host, port, username, password, privateKey, passphrase }
}

/** Read N bytes from `chunks` worth of buffers, capped at `cap`. Returns `{ text, truncated }`.
 * Exported for unit tests; the truncation boundary is the most error-prone
 * piece of logic in this file. */
export function collect(chunks: Buffer[], cap: number): { text: string; truncated: boolean } {
  const total = chunks.reduce((n, b) => n + b.length, 0)
  if (total <= cap) return { text: Buffer.concat(chunks).toString('utf8'), truncated: false }
  const out: Buffer[] = []
  let used = 0
  for (const chunk of chunks) {
    const remaining = cap - used
    if (remaining <= 0) break
    if (chunk.length <= remaining) {
      out.push(chunk)
      used += chunk.length
    } else {
      out.push(chunk.subarray(0, remaining))
      used = cap
    }
  }
  return { text: Buffer.concat(out).toString('utf8'), truncated: true }
}

/** One exec call: build the connect config, run command, collect output, resolve. */
function execOnce(
  cfg: ResolvedSshConfig,
  command: string,
  timeoutMs: number,
  maxOutputBytes: number,
  signal: AbortSignal | undefined,
): Promise<SshExecResult> {
  return new Promise<SshExecResult>((resolve, reject) => {
    const client = new Client()
    let settled = false
    let stream: ClientChannel | undefined

    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      client.end()
      fn()
    }

    const timer = setTimeout(() => {
      stream?.destroy()
      finish(() => reject(new Error(`ssh: command timed out after ${timeoutMs} ms`)))
    }, timeoutMs)

    const onAbort = (): void => {
      stream?.destroy()
      finish(() => reject(new Error('ssh: command aborted')))
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    client.once('ready', () => {
      client.exec(command, (err, channel) => {
        if (err !== undefined && err !== null) {
          finish(() => reject(new Error(`ssh: failed to start command: ${err.message}`)))
          return
        }
        stream = channel
        const stdoutChunks: Buffer[] = []
        const stderrChunks: Buffer[] = []

        channel.on('data', (chunk: Buffer) => { stdoutChunks.push(chunk) })
        channel.stderr.on('data', (chunk: Buffer) => { stderrChunks.push(chunk) })
        channel.on('exit', (code: number | null) => {
          const stdout = collect(stdoutChunks, maxOutputBytes)
          const stderr = collect(stderrChunks, maxOutputBytes)
          finish(() => resolve({
            exitCode: code,
            stdout: stdout.text,
            stderr: stderr.text,
            truncated: stdout.truncated || stderr.truncated,
          }))
        })
        channel.on('close', () => {
          const stdout = collect(stdoutChunks, maxOutputBytes)
          const stderr = collect(stderrChunks, maxOutputBytes)
          finish(() => resolve({
            exitCode: null,
            stdout: stdout.text,
            stderr: stderr.text,
            truncated: stdout.truncated || stderr.truncated,
          }))
        })
        channel.on('error', (channelErr: Error) => {
          finish(() => reject(new Error(`ssh: channel error: ${channelErr.message}`)))
        })
      })
    })

    client.once('error', (err: Error & { code?: string }) => {
      const hint = err.code === 'ECONNREFUSED'
        ? '; the SSH server refused the connection — check host/port and that sshd is running'
        : err.code === 'ETIMEDOUT'
          ? '; the SSH server did not respond in time'
          : err.code === 'ENOTFOUND'
            ? '; the SSH host could not be resolved'
            : ''
      finish(() => reject(new Error(`ssh: ${err.message}${hint}`)))
    })

    const connectOpts: ConnectConfig = {
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      keepaliveInterval: 30_000,
      readyTimeout: 15_000,
      ...(cfg.password ? { password: cfg.password } : {}),
      ...(cfg.privateKey ? { privateKey: cfg.privateKey } : {}),
      ...(cfg.passphrase ? { passphrase: cfg.passphrase } : {}),
    }
    try {
      client.connect(connectOpts)
    } catch (err) {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))))
    }
  })
}

/** Cordis Service hosting the active SSH client. */
export class SshManager extends Service {
  /** Services required before load (none today; subprocess is referenced opportunistically). */
  static inject: string[] = []

  /** The currently authoritative config; set by `installSettingsSection.setSource`. */
  private source: () => ResolvedSshConfig | undefined = () => undefined

  constructor(ctx: Context) {
    super(ctx, 'ssh')
  }

  /**
   * Install the config source. Called by the host plugin's
   * `installSettingsSection` hook so each exec reads the live document.
   */
  setSource(source: () => ResolvedSshConfig | undefined): void {
    this.source = source
  }

  /**
   * Run one command on the SSH server. Each call spins a short-lived
   * `ssh2.Client` so a tool never needs to manage connection state — the
   * settings document alone decides where the command lands.
   */
  async exec(command: string, options: {
    timeoutMs?: number
    maxOutputBytes?: number
    signal?: AbortSignal
  } = {}): Promise<SshExecResult> {
    const config = this.source()
    if (config === undefined) {
      throw new Error('ssh: no configuration; fill in the SSH card under Settings → Plugins → SSH')
    }
    const resolved = resolveFromEnv(config)
    if (!resolved.username) {
      throw new Error('ssh: username is empty; fill it in the SSH card or set DSH_SSH_USERNAME')
    }
    // host cannot be empty here: resolveFromEnv falls back to 'localhost'
    // when both config.host and DSH_SSH_HOST are blank.
    if (!resolved.password && !resolved.privateKey) {
      throw new Error('ssh: neither password nor private key is set; fill one in the SSH card')
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
      throw new Error(`ssh: timeoutMs must be in (0, ${MAX_TIMEOUT_MS}]`)
    }
    if (!Number.isFinite(maxOutputBytes) || maxOutputBytes <= 0) {
      throw new Error('ssh: maxOutputBytes must be positive')
    }
    return execOnce(resolved, command, timeoutMs, maxOutputBytes, options.signal)
  }

  /** Disconnect every active client; called by the host plugin's disposer. */
  disposeAll(): void {
    // Each exec spins a short-lived client and disposes it on settle; nothing
    // to clean up here today. Kept as an extension point.
  }
}
