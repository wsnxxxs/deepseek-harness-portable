'use strict'

const IMMUTABLE_MARKER = 'const IMMUTABLE_STATIC_CACHE = "public, max-age=31536000, immutable";'

/** Add long-lived caching only to content-hashed frontend assets, never to index.html. */
function patchFrontendStaticCacheHeaders(source) {
  if (source.includes(IMMUTABLE_MARKER)) return source

  const marker = 'const STATIC_MISS_CODES = new Set(['
  if (!source.includes(marker)) throw new Error('frontend-static source no longer exposes its miss-code table')
  let output = source.replace(
    marker,
    `${IMMUTABLE_MARKER}
/** Only Vite-style hashed assets are safe to cache across releases. */
function isImmutableStaticAsset(pathname) {
\treturn /^\\/assets\\/[^/]+-[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9]+$/i.test(pathname);
}
${marker}`,
  )
  const response = 'res.writeHead(200, { "content-type": type });'
  if (!output.includes(response)) throw new Error('frontend-static source no longer exposes its 200 response')
  output = output.replace(
    response,
    `res.writeHead(200, {
\t\t"content-type": type,
\t\t...isImmutableStaticAsset(pathname) ? { "cache-control": IMMUTABLE_STATIC_CACHE } : {}
\t});`,
  )
  return output
}

module.exports = { patchFrontendStaticCacheHeaders }
