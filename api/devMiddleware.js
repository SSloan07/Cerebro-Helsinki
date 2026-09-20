import liveMobilityHandler from './live-mobility.js'
import stopsHandler from './stops.js'

const handlers = new Map([
  ['/api/live-mobility', liveMobilityHandler],
  ['/api/stops', stopsHandler],
])

export function createApiDevMiddleware() {
  return async function localApi(request, response, next) {
    const requestUrl = new URL(request.url || '/', 'http://localhost')
    const handler = handlers.get(requestUrl.pathname)
    if (!handler) return next()
    const query = Object.fromEntries(requestUrl.searchParams.entries())
    const responseAdapter = {
      setHeader(name, value) { response.setHeader(name, value) },
      status(code) { response.statusCode = code; return this },
      json(payload) {
        if (!response.headersSent) response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify(payload))
        return this
      },
    }
    try {
      await handler({ method: request.method, query }, responseAdapter)
    } catch {
      response.statusCode = 500
      response.setHeader('Cache-Control', 'no-store')
      responseAdapter.json({ status: 'unavailable', reason: 'local_api_handler_error', http_status: 0,
        retrieved_at: new Date().toISOString(), source: 'Cerebro Helsinki local API' })
    }
  }
}
