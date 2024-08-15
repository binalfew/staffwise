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

/**
 * Generic type for pagination and filtering parameters.
 * @template TWhereInput - Type for filtering conditions
 * @template TOrderByInput - Type for ordering conditions
 * @template TResult - Type of the result items
 * @template TSelect - Type for selecting specific fields (optional)
 * @template TInclude - Type for including related data (optional)
 *
 * @property {LoaderFunctionArgs['request']} request - The request object
 * @property {Object} model - The database model with count and findMany methods
 * @property {Array<SearchField>} searchFields - Fields to search in
 * @property {TWhereInput} [where] - Additional filtering conditions
 * @property {TOrderByInput[]} orderBy - Ordering conditions
 * @property {TSelect} [select] - Fields to select in the result
 * @property {TInclude} [include] - Related data to include
 */
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
	searchFields: Array<SearchField>
	where?: TWhereInput
	orderBy: TOrderByInput[]
	select?: TSelect
	include?: TInclude
}

/**
 * Represents a field or set of fields to be searched.
 * Can be a string (single field), an object (nested fields),
 * or an array of SearchFields (multiple fields).
 *
 * // Single field
 * const field1: SearchField = 'name'
 *
 * // Nested fields
 * const field2: SearchField = { user: { profile: 'bio' } }
 *
 * // Multiple fields
 * const field3: SearchField = ['title', 'description', { author: 'name' }]
 */
type SearchField = string | { [key: string]: SearchField } | SearchField[]

/**
 * Represents a search condition object.
 * Keys are strings, and values can be of any type.
 * Used to build dynamic search queries.
 *
 * const condition: SearchCondition = {
 *   name: { contains: 'John', mode: 'insensitive' },
 *   age: { gt: 18 }
 * }
 */
type SearchCondition = {
	[key: string]: any
}

/**
 * Creates a search condition object based on the given field and search term.
 *
 * // Single field
 * createSearchCondition('name', 'John')
 * // { name: { contains: 'John', mode: 'insensitive' } }
 *
 * // Nested field
 * createSearchCondition('user.profile.bio', 'developer')
 * // { user: { profile: { bio: { contains: 'developer', mode: 'insensitive' } } } }
 *
 * // Multiple fields
 * createSearchCondition(['title', 'description'], 'example')
 * // { OR: [
 * //   { title: { contains: 'example', mode: 'insensitive' } },
 * //   { description: { contains: 'example', mode: 'insensitive' } }
 * // ] }
 */
function createSearchCondition(
	field: SearchField,
	searchTerm: string,
): { [key: string]: any } {
	if (typeof field === 'string') {
		const fieldParts = field.split('.')
		if (fieldParts.length > 1) {
			return createNestedCondition(fieldParts, searchTerm)
		} else {
			return { [field]: { contains: searchTerm, mode: 'insensitive' } }
		}
	} else if (Array.isArray(field)) {
		// Handle array of fields
		return {
			OR: field.map(subField => createSearchCondition(subField, searchTerm)),
		}
	} else {
		return Object.entries(field).reduce((acc, [key, value]) => {
			acc[key] = createSearchCondition(value, searchTerm)
			return acc
		}, {} as { [key: string]: any })
	}
}

/**
 * Creates a nested search condition object for dot-separated field paths.
 *
 * createNestedCondition(['user', 'profile', 'bio'], 'developer')
 * // Returns:
 * // {
 * //   user: {
 * //     profile: {
 * //       bio: { contains: 'developer', mode: 'insensitive' }
 * //     }
 * //   }
 * // }
 */
function createNestedCondition(
	fieldParts: string[],
	searchTerm: string,
): { [key: string]: any } {
	if (fieldParts.length === 1) {
		return { [fieldParts[0]]: { contains: searchTerm, mode: 'insensitive' } }
	}
	return {
		[fieldParts[0]]: createNestedCondition(fieldParts.slice(1), searchTerm),
	}
}

/**
 * Filters and paginates data based on search parameters and pagination settings.
 *
 * const result = await filterAndPaginate({
 *   request,
 *   model: prisma.user,
 *   searchFields: ['name', 'email'],
 *   orderBy: [{ createdAt: 'desc' }],
 * });
 */
export async function filterAndPaginate<
	TWhereInput,
	TOrderByInput,
	TResult,
	TSelect,
	TInclude,
>({
	request,
	model,
	searchFields = [] as SearchField[],
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

	let searchConditions: SearchCondition = {}
	if (searchTerm) {
		searchConditions = {
			OR: searchFields.flatMap(field =>
				createSearchCondition(field, searchTerm),
			),
		}
	}

	const combinedWhere = {
		...where,
		...searchConditions,
	} as TWhereInput & SearchCondition

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
