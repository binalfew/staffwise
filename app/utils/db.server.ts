import { faker } from '@faker-js/faker'
import { CounterType, PrismaClient } from '@prisma/client'
import { LoaderFunctionArgs } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import chalk from 'chalk'
import { UniqueEnforcer } from 'enforce-unique'
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

type PaginationAndFilterParams<
	TWhereInput,
	TOrderByInput,
	TResult,
	TSelect = any,
	TInclude = any,
> = {
	request: LoaderFunctionArgs['request']
	model: {
		count: (args?: { where?: TWhereInput }) => Promise<number>
		findMany: (args?: {
			where?: TWhereInput
			orderBy?: TOrderByInput[]
			take?: number
			skip?: number
			select?: TSelect
			include?: TInclude
		}) => Promise<TResult[]>
	}
	searchFields: Array<keyof TWhereInput>
	where?: TWhereInput
	orderBy: TOrderByInput[]
	select?: TSelect
	include?: TInclude
}

export async function filterAndPaginate<
	TWhereInput,
	TOrderByInput,
	TResult,
	TSelect,
	TInclude,
>({
	request,
	model,
	searchFields = [] as Array<keyof TWhereInput>,
	where = {} as TWhereInput,
	orderBy = [] as TOrderByInput[],
	select,
	include,
}: PaginationAndFilterParams<
	TWhereInput,
	TOrderByInput,
	TResult,
	TSelect,
	TInclude
>) {
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

	// Combine `where` conditions with search conditions
	const combinedWhere = {
		...where,
		...searchConditions,
	}

	const totalItems = await model.count({ where: combinedWhere })

	const totalPages = pageSize ? Math.ceil(totalItems / pageSize) : 1

	const data = await model.findMany({
		where: combinedWhere,
		orderBy,
		take: pageSize,
		skip: pageSize ? (page - 1) * pageSize : undefined,
		...(select ? { select } : {}),
		...(include ? { include } : {}),
	})

	return {
		data,
		totalPages,
		currentPage: page,
	}
}

const uniqueUsernameEnforcer = new UniqueEnforcer()

export function createUser() {
	const firstName = faker.person.firstName()
	const lastName = faker.person.lastName()

	const username = uniqueUsernameEnforcer
		.enforce(() => {
			return (
				faker.string.alphanumeric({ length: 2 }) +
				'_' +
				faker.internet.userName({
					firstName: firstName.toLowerCase(),
					lastName: lastName.toLowerCase(),
				})
			)
		})
		.slice(0, 20)
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
	return {
		username,
		name: `${firstName} ${lastName}`,
		email: `${username}@example.com`,
	}
}

export function createPassword(password: string = faker.internet.password()) {
	return {
		hash: bcrypt.hashSync(password, 10),
	}
}

export async function generateSerialNumber(counterType: CounterType) {
	const result = await prisma.$transaction(async prisma => {
		const counterRecord = await prisma.counter.update({
			where: { type: counterType },
			data: {
				lastCounter: {
					increment: 1,
				},
			},
			select: { lastCounter: true },
		})

		return counterRecord.lastCounter
	})

	// Pad the counter with leading zeros to ensure it is 10 digits long
	const uniqueNumber = result.toString().padStart(10, '0')
	return uniqueNumber
}

export { prisma }
