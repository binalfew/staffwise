import { createRequestHandler } from '@remix-run/express'
import { installGlobals } from '@remix-run/node'
import compression from 'compression'
import express from 'express'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'

installGlobals()

const viteDevServer =
	process.env.NODE_ENV === 'production'
		? undefined
		: await import('vite').then(vite =>
				vite.createServer({
					server: { middlewareMode: true },
				}),
		  )

const remixHandler = createRequestHandler({
	build: viteDevServer
		? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
		: await import('./build/server/index.js'),
})

const app = express()

app.use(compression())

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by')

// Azure App Service puts one front-end proxy in front of the app. Trust exactly
// that hop so req.ip is the client from X-Forwarded-For, not the proxy. Without
// this every user shares a single rate-limit bucket.
app.set('trust proxy', 1)

// handle asset requests
if (viteDevServer) {
	app.use(viteDevServer.middlewares)
} else {
	// Vite fingerprints its assets so we can cache forever.
	app.use(
		'/assets',
		express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
	)
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build/client', { maxAge: '1h' }))

app.use(morgan('tiny'))

// Azure's X-Forwarded-For includes the client port ("1.2.3.4:5678" or
// "[2001:db8::1]:5678"). Strip it so one client maps to one key.
function clientIp(req) {
	const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
	if (ip.startsWith('[')) return ip.slice(1, ip.indexOf(']'))
	const parts = ip.split(':')
	return parts.length === 2 ? parts[0] : ip
}

// Limits are per client IP. Regional offices sit behind shared NAT, so many
// staff can share one IP; keep the GET limit generous.
const maxMultiple = process.env.TESTING ? 10_000 : 1
const rateLimitDefault = {
	windowMs: 60 * 1000,
	max: 1000 * maxMultiple,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: clientIp,
	skip: req => req.path === '/resources/healthcheck',
}

const strongestRateLimit = rateLimit({
	...rateLimitDefault,
	max: 30 * maxMultiple,
})

const strongRateLimit = rateLimit({
	...rateLimitDefault,
	max: 100 * maxMultiple,
})

const generalRateLimit = rateLimit(rateLimitDefault)

app.use((req, res, next) => {
	const strongPaths = ['/signup']
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		if (strongPaths.some(path => req.path.includes(path))) {
			return strongestRateLimit(req, res, next)
		}

		return strongRateLimit(req, res, next)
	}
	return generalRateLimit(req, res, next)
})

// handle SSR requests
app.all('*', remixHandler)

const port = process.env.PORT || 3000
app.listen(port, () =>
	console.log(`Express server listening at http://localhost:${port}`),
)
