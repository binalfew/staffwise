import { PrismaClient } from '@prisma/client'
import { LoaderFunctionArgs } from '@remix-run/node'
import chalk from 'chalk'
import { singleton } from './singleton.server'

const prisma = singleton('prisma', () => {
	// NOTE: if you change anything in this function you'll need to restart
	// the dev server to see your changes.

	// we'll set the logThreshold to 0 so you see all the queries, but in a
	// production app you'd probably want to fine-tune this value to something
	// you're more comfortable with.
	const logThreshold = 25

	const client = new PrismaClient({
		log: [
			{ level: 'query', emit: 'event' },
			{ level: 'error', emit: 'stdout' },
			{ level: 'info', emit: 'stdout' },
			{ level: 'warn', emit: 'stdout' },
		],
	})

	client.$on('query', async e => {
		if (e.duration < logThreshold) return
		const color =
			e.duration < logThreshold * 1.1
				? 'green'
				: e.duration < logThreshold * 1.2
				? 'blue'
				: e.duration < logThreshold * 1.3
				? 'yellow'
				: e.duration < logThreshold * 1.4
				? 'redBright'
				: 'red'
		const dur = chalk[color](`${e.duration}ms`)
		console.info(`prisma:query - ${dur} - ${e.query}`)
	})
	client.$connect()
	return client
})

type PaginationAndFilterParams<TWhereInput, TOrderByInput, TResult> = {
	request: LoaderFunctionArgs['request']
	model: {
		count: (args?: { where?: TWhereInput }) => Promise<number>
		findMany: (args?: {
			where?: TWhereInput
			orderBy?: TOrderByInput[]
			take?: number
			skip?: number
		}) => Promise<TResult[]>
	}
	searchFields: Array<keyof TWhereInput>
	orderBy: TOrderByInput[]
}

export async function filterAndPaginate<TWhereInput, TOrderByInput, TResult>({
	request,
	model,
	searchFields = [] as Array<keyof TWhereInput>,
	orderBy = [] as TOrderByInput[],
}: PaginationAndFilterParams<TWhereInput, TOrderByInput, TResult>) {
	const url = new URL(request.url)
	const searchTerm = url.searchParams.get('search') || ''
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSizeParam = url.searchParams.get('pageSize')
	const pageSize =
		pageSizeParam === 'All' ? undefined : parseInt(pageSizeParam || '10', 10)

	let searchConditions: any = {}
	if (searchTerm) {
		searchConditions = {
			OR: searchFields.map(field => ({
				[field]: { contains: searchTerm, mode: 'insensitive' },
			})),
		}
	}

	const totalItems = await model.count({
		where: searchConditions,
	})

	const totalPages = pageSize ? Math.ceil(totalItems / pageSize) : 1

	const data = await model.findMany({
		where: searchConditions,
		orderBy,
		take: pageSize,
		skip: pageSize ? (page - 1) * pageSize : undefined,
	})

	return {
		data,
		totalPages,
		currentPage: page,
	}
}

export { prisma }
