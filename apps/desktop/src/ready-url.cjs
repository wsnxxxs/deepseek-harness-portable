/**
 * Extract the loopback URL printed by the web profile.
 *
 * @param {string} output - accumulated Harness stdout/stderr.
 * @returns {string|undefined} the local URL when the server is ready.
 */
function readyUrl(output) {
  if (typeof output !== 'string') return undefined
  // Strip ANSI escape sequences if any
  const clean = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
  return clean.match(/(?:^|\r?\n)dsh web:\s*(http:\/\/127\.0\.0\.1:\d+)/)?.[1]
}

/** Bootstrap package whose blocking client bundle creates the browser module system. */
const CLIENT_MODULES_ENTRY = '@deepseek-ai/dsh-client-modules'

/** The browser shell cannot activate until its bootstrap and core shell roots exist. */
const REQUIRED_CLIENT_ENTRIES = [
  CLIENT_MODULES_ENTRY,
  '@deepseek-ai/dsh-client-ui-session',
  '@deepseek-ai/dsh-client-ui-layout',
]

/** Build the settings RPC endpoint without producing a double-slash path. */
function urlWithPathPreservingSearch(baseUrl, pathname) {
  const url = new URL(baseUrl)
  url.pathname = pathname
  url.hash = ''
  return url.href
}

/** Read the browser-session cookie issued by the launch-token exchange. */
function readSessionCookie(response) {
  const cookies = typeof response?.headers?.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response?.headers?.get('set-cookie')].filter(Boolean)
  return cookies
    .map(cookie => cookie.split(';', 1)[0])
    .find(cookie => cookie.length > 0)
}

function settingsDescribeUrl(baseUrl) {
  return urlWithPathPreservingSearch(baseUrl, '/api/settings/describe')
}

/**
 * Verify an already-started runtime without allowing either authentication or
 * the RPC body to wait forever. This is used by the background health monitor;
 * release smoke tests retain the stronger `waitForOnboardingReady` check below.
 *
 * @param {string} baseUrl - authenticated loopback URL returned by the runtime.
 * @param {{ timeoutMs?: number, failureMessage?: string }} [options]
 * @returns {Promise<void>}
 */
async function probeHarnessHealth(baseUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 3_000
  const signal = AbortSignal.timeout(Math.max(1, timeoutMs))
  const loginUrl = new URL(baseUrl)
  loginUrl.pathname = '/'
  loginUrl.hash = ''
  const login = await fetch(loginUrl, { redirect: 'manual', signal })
  const cookie = readSessionCookie(login)
  if (cookie === undefined && !login.ok) throw new Error(`HTTP ${login.status}`)
  const headers = { 'content-type': 'application/json' }
  if (cookie !== undefined) headers.cookie = cookie
  const response = await fetch(settingsDescribeUrl(baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `desktop-health-${Date.now()}`,
      method: 'settings/describe',
      payload: { args: {} },
    }),
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (!body?.result?.ok) {
    throw new Error(body?.result?.error?.message || options.failureMessage || 'settings.describe failed')
  }
}

/**
 * Parse the JSON boot graph injected into the web index document.
 *
 * The graph is deliberately read from the served document rather than inferred
 * from an API response: the browser consumes this exact snapshot on navigation.
 *
 * @param {string} html - served index document.
 * @returns {{ rev?: string, entries?: Array<{ id?: string, inject?: string[] }>, batches?: Array<{ phase?: string, url?: string, entries?: string[] }> }|undefined}
 */
function parseBootManifest(html) {
  if (typeof html !== 'string') return undefined
  const match = html.match(/(?:window\.__DSH_BOOT__|globalThis\[\s*["']__DSH_BOOT__["']\s*\])\s*=\s*(\{[\s\S]*?\})\s*<\/script>/)
  if (!match) return undefined
  try {
    const manifest = JSON.parse(match[1])
    return manifest !== null && typeof manifest === 'object' ? manifest : undefined
  } catch {
    return undefined
  }
}

/** Decode the only HTML entity emitted inside generated plugin URLs. */
function scriptSources(html) {
  if (typeof html !== 'string') return []
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)]
    .map(match => match[1].replaceAll('&amp;', '&'))
}

/**
 * Read one coherent browser-boot snapshot from the exact served HTML.
 *
 * A populated graph alone is insufficient: the parser bootstrap must also be
 * emitted as a blocking script. Without it the Vite shell still loads, but it
 * can only render `HTML did not preload @deepseek-ai/dsh-client-modules`.
 */
function browserBootSnapshot(html) {
  const manifest = parseBootManifest(html)
  if (!hasRequiredClientGraph(manifest) || !Array.isArray(manifest?.batches)) return undefined
  const bootstrap = manifest.batches.find(batch => batch?.phase === 'bootstrap'
    && Array.isArray(batch.entries)
    && batch.entries.includes(CLIENT_MODULES_ENTRY))
  if (typeof bootstrap?.url !== 'string' || !scriptSources(html).includes(bootstrap.url)) return undefined
  return {
    bootstrapUrl: bootstrap.url,
    revision: typeof manifest.rev === 'string' ? manifest.rev : '',
  }
}

/**
 * Check that the graph contains the shell's roots and every declared inject
 * dependency beneath them. This avoids hard-coding the entire client roster
 * while still rejecting a partially scanned graph.
 *
 * @param {{ entries?: Array<{ id?: string, inject?: string[] }> }|undefined} manifest
 * @returns {boolean}
 */
function hasRequiredClientGraph(manifest) {
  if (!Array.isArray(manifest?.entries)) return false
  const rows = new Map(manifest.entries
    .filter(row => row !== null && typeof row === 'object' && typeof row.id === 'string')
    .map(row => [row.id, row]))
  const pending = [...REQUIRED_CLIENT_ENTRIES]
  const seen = new Set()
  while (pending.length > 0) {
    const id = pending.pop()
    if (seen.has(id)) continue
    seen.add(id)
    const row = rows.get(id)
    if (!row) return false
    if (Array.isArray(row.inject)) pending.push(...row.inject)
  }
  return true
}

/**
 * Wait until both host and browser boot prerequisites are ready.
 *
 * The web server can answer `/` and `settings.describe` before the incremental
 * client-module scan has populated the boot graph. Opening that first document
 * produces the permanent app-shell error shown by the desktop client, because
 * the browser has already captured an empty graph. Poll the same index document
 * the browser will consume and require the shell's transitive dependency graph
 * before resolving.
 *
 * @param {string} baseUrl - loopback web URL returned by the launcher.
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<void>}
 */
async function waitForOnboardingReady(baseUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20_000
  const intervalMs = options.intervalMs ?? 120
  const launchUrl = urlWithPathPreservingSearch(baseUrl, '/')
  const cleanBaseUrl = new URL(baseUrl)
  cleanBaseUrl.search = ''
  cleanBaseUrl.hash = ''
  const hasLaunchToken = new URL(baseUrl).searchParams.has('token')
  let requestBaseUrl = baseUrl
  let sessionCookie
  let sessionEstablished = !hasLaunchToken
  const deadline = Date.now() + timeoutMs
  let lastReason = 'settings.describe has not completed'
  let settingsReady = false
  let stableBrowserSnapshot
  let stableBrowserSnapshotCount = 0
  while (Date.now() < deadline) {
    const remainingMs = () => Math.min(1500, Math.max(1, deadline - Date.now()))
    if (!sessionEstablished) {
      try {
        const response = await fetch(launchUrl, {
          redirect: 'manual',
          headers: { 'cache-control': 'no-cache' },
          signal: AbortSignal.timeout(remainingMs()),
        })
        const cookie = readSessionCookie(response)
        if (cookie !== undefined) {
          sessionCookie = cookie
          requestBaseUrl = cleanBaseUrl.href
          sessionEstablished = true
        } else if (response.ok) {
          sessionEstablished = true
        } else {
          throw new Error(`web authentication HTTP ${response.status}`)
        }
      } catch (error) {
        lastReason = error instanceof Error ? error.message : String(error)
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        continue
      }
    }
    const requestHeaders = (initial) => {
      const headers = new Headers(initial)
      if (sessionCookie !== undefined) headers.set('cookie', sessionCookie)
      return headers
    }
    const settingsUrl = urlWithPathPreservingSearch(requestBaseUrl, '/api/settings/describe')
    const indexUrl = urlWithPathPreservingSearch(requestBaseUrl, '/')
    if (!settingsReady) {
      try {
        const response = await fetch(settingsUrl, {
          method: 'POST',
          headers: requestHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            type: 'client-request',
            rpcId: `desktop-readiness-${Date.now()}`,
            method: 'settings/describe',
            payload: { args: {} },
          }),
          signal: AbortSignal.timeout(remainingMs()),
        })
        if (!response.ok) {
          lastReason = `settings.describe HTTP ${response.status}`
        } else {
          const body = await response.json()
          const namespaces = new Set(body?.result?.value?.namespaces?.map(namespace => namespace.ns) ?? [])
          if (body?.result?.ok && namespaces.has('ui-onboarding')) {
            settingsReady = true
          } else {
            lastReason = body?.result?.error?.message ?? 'required settings namespaces are not registered'
          }
        }
      } catch (error) {
        lastReason = error instanceof Error ? error.message : String(error)
      }
    }
    let browserSnapshotCoherent = false
    let browserReady = false
    try {
      const response = await fetch(indexUrl, {
        headers: requestHeaders({ 'cache-control': 'no-cache' }),
        signal: AbortSignal.timeout(remainingMs()),
      })
      if (!response.ok) {
        lastReason = `web index HTTP ${response.status}`
      } else {
        const snapshot = browserBootSnapshot(await response.text())
        if (snapshot === undefined) {
          lastReason = 'client plugin bootstrap is not populated'
        } else {
          const bootstrapResponse = await fetch(new URL(snapshot.bootstrapUrl, indexUrl), {
            headers: requestHeaders({ 'cache-control': 'no-cache' }),
            signal: AbortSignal.timeout(remainingMs()),
          })
          if (!bootstrapResponse.ok) {
            lastReason = `client plugin bootstrap HTTP ${bootstrapResponse.status}`
          } else if (!(await bootstrapResponse.text()).includes(CLIENT_MODULES_ENTRY)) {
            lastReason = 'client plugin bootstrap did not register the module system'
          } else {
            const signature = `${snapshot.revision}\n${snapshot.bootstrapUrl}`
            browserSnapshotCoherent = true
            stableBrowserSnapshotCount = signature === stableBrowserSnapshot
              ? stableBrowserSnapshotCount + 1
              : 1
            stableBrowserSnapshot = signature
            browserReady = stableBrowserSnapshotCount >= 2
            if (!browserReady) lastReason = 'client plugin bootstrap has not stabilized'
          }
        }
      }
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error)
    }
    if (!browserSnapshotCoherent) {
      stableBrowserSnapshot = undefined
      stableBrowserSnapshotCount = 0
    }
    if (settingsReady && browserReady) return
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Host onboarding readiness timed out: ${lastReason}`)
}

module.exports = {
  browserBootSnapshot,
  hasRequiredClientGraph,
  parseBootManifest,
  probeHarnessHealth,
  readyUrl,
  readSessionCookie,
  settingsDescribeUrl,
  waitForOnboardingReady,
}
