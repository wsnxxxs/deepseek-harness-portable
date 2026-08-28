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

/** The browser shell cannot activate until its shell and portable feature roots exist. */
const REQUIRED_CLIENT_ENTRIES = [
  '@deepseek-ai/dsh-client-ui-session',
  '@deepseek-ai/dsh-client-ui-layout',
  '@dsh-portable/interactive-learning',
  '@dsh-portable/vision-bridge',
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
 * Parse the JSON boot graph injected into the web index document.
 *
 * The graph is deliberately read from the served document rather than inferred
 * from an API response: the browser consumes this exact snapshot on navigation.
 *
 * @param {string} html - served index document.
 * @returns {{ entries?: Array<{ id?: string, inject?: string[] }> }|undefined}
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
  let clientGraphReady = false
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
          if (body?.result?.ok && namespaces.has('ui-onboarding') && namespaces.has('vision')) {
            settingsReady = true
          } else {
            lastReason = body?.result?.error?.message ?? 'required settings namespaces are not registered'
          }
        }
      } catch (error) {
        lastReason = error instanceof Error ? error.message : String(error)
      }
    }
    if (!clientGraphReady) {
      try {
        const response = await fetch(indexUrl, {
          headers: requestHeaders({ 'cache-control': 'no-cache' }),
          signal: AbortSignal.timeout(remainingMs()),
        })
        if (!response.ok) {
          lastReason = `web index HTTP ${response.status}`
        } else if (hasRequiredClientGraph(parseBootManifest(await response.text()))) {
          clientGraphReady = true
        } else {
          lastReason = 'client plugin graph is not populated'
        }
      } catch (error) {
        lastReason = error instanceof Error ? error.message : String(error)
      }
    }
    if (settingsReady && clientGraphReady) return
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Host onboarding readiness timed out: ${lastReason}`)
}

module.exports = {
  hasRequiredClientGraph,
  parseBootManifest,
  readyUrl,
  readSessionCookie,
  settingsDescribeUrl,
  waitForOnboardingReady,
}
