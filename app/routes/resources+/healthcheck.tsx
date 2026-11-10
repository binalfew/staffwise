import { prisma } from '~/utils/db.server'

// Target for uptime monitors. Checks that the app can reach the database.
export async function loader() {
	try {
		await prisma.$queryRaw`SELECT 1`
		return new Response('OK', { headers: { 'Cache-Control': 'no-store' } })
	} catch (error: unknown) {
		console.error('healthcheck failed', error)
		return new Response('ERROR', {
			status: 500,
			headers: { 'Cache-Control': 'no-store' },
		})
	}
}
