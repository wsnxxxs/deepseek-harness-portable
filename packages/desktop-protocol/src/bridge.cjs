'use strict'

const { encodeRuntimeEvent, protocolEnabled } = require('./index.cjs')

exports.name = 'desktop-bridge'
exports.inject = ['webServer', 'connection', 'loader']

/** Report readiness after the official Loader finishes; own no product UI or agent behavior. */
exports.apply = function apply(ctx) {
  if (!protocolEnabled()) return
  let disposed = false
  ctx.effect(() => () => { disposed = true })
  // Awaiting the Loader inside apply would deadlock on this plugin's own activation.
  void ctx.loader.await().then(() => {
    if (disposed) return
    const url = ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`)
    console.log(encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url }))
  }).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
