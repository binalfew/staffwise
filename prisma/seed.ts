import { createPassword, prisma } from '~/utils/db.server'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await prisma.floor.deleteMany()
	await prisma.location.deleteMany()
	await prisma.department.deleteMany()
	await prisma.organ.deleteMany()
	await prisma.country.deleteMany()
	await prisma.relationship.deleteMany()
	await prisma.user.deleteMany()
	await prisma.role.deleteMany()
	await prisma.permission.deleteMany()
	console.timeEnd('🧹 Cleaned up the database...')

	const entities = [
		'country',
		'organ',
		'department',
		'location',
		'floor',
		'relationship',
		'user',
		'role',
		'permission',
	]
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any']

	const permissions = []
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				permissions.push({
					entity,
					action,
					access,
				})
			}
		}
	}
	await prisma.permission.createMany({ data: permissions })

	// Fetch permissions with 'any' access once
	const permissionsAny = await prisma.permission.findMany({
		select: { id: true },
		where: { access: 'any' },
	})

	// Fetch permissions with 'own' access
	const permissionsOwn = await prisma.permission.findMany({
		select: { id: true },
		where: { access: 'own' },
	})

	// Create 'admin' role
	await prisma.role.create({
		data: {
			name: 'admin',
			description: 'admin',
			permissions: {
				connect: permissionsAny,
			},
		},
	})

	// Create 'user' role
	await prisma.role.create({
		data: {
			name: 'user',
			description: 'user',
			permissions: {
				connect: permissionsOwn,
			},
		},
	})

	// Create country
	console.time(`🐨 Created lookup data"`)
	await prisma.country.createMany({
		data: [
			{
				name: 'Ethiopia',
				code: 'ET',
				isMemberState: true,
			},
			{
				name: 'Kenya',
				code: 'KE',
				isMemberState: true,
			},
			{
				name: 'Uganda',
				code: 'UG',
				isMemberState: true,
			},
			{
				name: 'Tanzania',
				code: 'TZ',
				isMemberState: true,
			},
			{
				name: 'Rwanda',
				code: 'RW',
				isMemberState: true,
			},
			{
				name: 'Burundi',
				code: 'BI',
				isMemberState: true,
			},
			{
				name: 'South Sudan',
				code: 'SS',
				isMemberState: true,
			},
			{
				name: 'Somalia',
				code: 'SO',
				isMemberState: true,
			},
			{
				name: 'Djibouti',
				code: 'DJ',
				isMemberState: true,
			},
			{
				name: 'Eritrea',
				code: 'ER',
				isMemberState: true,
			},
			{
				name: 'Sudan',
				code: 'SD',
				isMemberState: true,
			},
			{
				name: 'Egypt',
				code: 'EG',
				isMemberState: true,
			},
			{
				name: 'Libya',
				code: 'LY',
				isMemberState: true,
			},
			{
				name: 'Tunisia',
				code: 'TN',
				isMemberState: true,
			},
			{
				name: 'Algeria',
				code: 'DZ',
				isMemberState: true,
			},
			{
				name: 'Morocco',
				code: 'MA',
				isMemberState: true,
			},
			{
				name: 'Mauritania',
				code: 'MR',
				isMemberState: true,
			},
			{
				name: 'Mali',
				code: 'ML',
				isMemberState: true,
			},
			{
				name: 'Niger',
				code: 'NE',
				isMemberState: true,
			},
			{
				name: 'Chad',
				code: 'TD',
				isMemberState: true,
			},
			{
				name: 'Sudan',
				code: 'SD',
				isMemberState: true,
			},
			{
				name: 'Central African Republic',
				code: 'CF',
				isMemberState: true,
			},
		],
	})
	console.timeEnd(`🐨 Created lookup data"`)

	console.time(`🐨 Created admin user "binalfew"`)
	await prisma.user.create({
		data: {
			email: 'binalfew@staffwise.com',
			username: 'binalfew',
			name: 'Binalfew',
			password: {
				create: createPassword('password'),
			},
			roles: {
				connect: [{ name: 'admin' }, { name: 'user' }],
			},
		},
	})
	console.timeEnd(`🐨 Created admin user "binalfew"`)

	// Create user with 'user' role
	const users = ['makida', 'kebron', 'maidot', 'lemlem']
	for (const user of users) {
		console.time(`🐨 Created user "${user}"`)
		await prisma.user.create({
			data: {
				email: `${user}@staffwise.com`,
				username: user,
				name: user,
				password: {
					create: createPassword('password'),
				},
				roles: {
					connect: [{ name: 'user' }],
				},
			},
		})
		console.timeEnd(`🐨 Created user "${user}"`)
	}

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
