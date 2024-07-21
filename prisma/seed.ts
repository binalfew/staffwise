import { createPassword, prisma } from '~/utils/db.server'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')

	await prisma.dependant.deleteMany()
	await prisma.spouse.deleteMany()
	await prisma.vehicle.deleteMany()
	await prisma.assessment.deleteMany()
	await prisma.incident.deleteMany()
	await prisma.visitor.deleteMany()
	await prisma.accessRequest.deleteMany()
	await prisma.employee.deleteMany()

	await prisma.floor.deleteMany()
	await prisma.location.deleteMany()
	await prisma.department.deleteMany()
	await prisma.organ.deleteMany()
	await prisma.country.deleteMany()
	await prisma.relationship.deleteMany()
	await prisma.incidentType.deleteMany()
	await prisma.user.deleteMany()
	await prisma.verification.deleteMany()
	await prisma.role.deleteMany()
	await prisma.permission.deleteMany()
	await prisma.accessRequestCounter.deleteMany()
	await prisma.accessRequest.deleteMany()
	console.timeEnd('🧹 Cleaned up the database...')

	const entities = [
		'country',
		'organ',
		'department',
		'location',
		'floor',
		'relationship',
		'incident',
		'incidentType',
		'actionType',
		'user',
		'role',
		'permission',
		'accessRequest',
		'accessRequestCounter',
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
			{ name: 'Ethiopia', code: 'ET', isMemberState: true },
			{ name: 'Kenya', code: 'KE', isMemberState: true },
			{ name: 'Uganda', code: 'UG', isMemberState: true },
			{ name: 'Tanzania', code: 'TZ', isMemberState: true },
			{ name: 'Rwanda', code: 'RW', isMemberState: true },
			{ name: 'Burundi', code: 'BI', isMemberState: true },
			{ name: 'South Sudan', code: 'SS', isMemberState: true },
			{ name: 'Somalia', code: 'SO', isMemberState: true },
			{ name: 'Djibouti', code: 'DJ', isMemberState: true },
			{ name: 'Eritrea', code: 'ER', isMemberState: true },
			{ name: 'Sudan', code: 'SD', isMemberState: true },
			{ name: 'Egypt', code: 'EG', isMemberState: true },
			{ name: 'Libya', code: 'LY', isMemberState: true },
			{ name: 'Tunisia', code: 'TN', isMemberState: true },
			{ name: 'Algeria', code: 'DZ', isMemberState: true },
			{ name: 'Morocco', code: 'MA', isMemberState: true },
			{ name: 'Mauritania', code: 'MR', isMemberState: true },
			{ name: 'Mali', code: 'ML', isMemberState: true },
			{ name: 'Niger', code: 'NE', isMemberState: true },
			{ name: 'Chad', code: 'TD', isMemberState: true },
			{ name: 'Sudan', code: 'SD', isMemberState: true },
			{ name: 'Central African Republic', code: 'CF', isMemberState: true },
			{ name: 'South Africa', code: 'ZA', isMemberState: true },
		],
	})

	const ethiopia = await prisma.country.findFirst({
		where: { name: 'Ethiopia' },
		select: { id: true },
	})
	const southAfrica = await prisma.country.findFirst({
		where: { name: 'South Africa' },
		select: { id: true },
	})

	// Create organ
	await prisma.organ.createMany({
		data: [
			{
				name: 'African Union Commission',
				code: 'AUC',
				countryId: ethiopia?.id ?? '',
				address: 'Addis Ababa, Ethiopia',
			},
			{
				name: 'Pan African Parliament',
				code: 'PAP',
				countryId: southAfrica?.id ?? '',
				address: 'Midrand, South Africa',
			},
			{
				name: "New Partnership for Africa's Development",
				code: 'NEPAD',
				countryId: southAfrica?.id ?? '',
				address: 'Midrand, South Africa',
			},
			{
				name: 'African Peer Review Mechanism',
				code: 'APRM',
				countryId: southAfrica?.id ?? '',
				address: 'Midrand, South Africa',
			},
		],
	})

	const auc = await prisma.organ.findFirst({
		where: { name: 'African Union Commission' },
		select: { id: true },
	})

	// Create department
	await prisma.department.createMany({
		data: [
			{
				name: 'Administration and Human Resources Directorate',
				code: 'AHRD',
				organId: auc?.id ?? '',
			},
			{
				name: 'Program Planning, Budgeting, Finance and Accounting',
				code: 'PPBFA',
				organId: auc?.id ?? '',
			},
			{
				name: 'Management of Information System Directorate',
				code: 'MISD',
				organId: auc?.id ?? '',
			},
			{
				name: 'Peace and Security Directorate',
				code: 'PSD',
				organId: auc?.id ?? '',
			},
		],
	})

	// Location
	await prisma.location.createMany({
		data: [
			{
				name: 'Building A',
				code: 'A',
				organId: auc?.id ?? '',
			},
			{
				name: 'Building B',
				code: 'B',
				organId: auc?.id ?? '',
			},
			{
				name: 'Building C',
				code: 'C',
				organId: auc?.id ?? '',
			},
			{
				name: 'Old Conference Center',
				code: 'OCC',
				organId: auc?.id ?? '',
			},
			{
				name: 'New Conference Center',
				code: 'NCC',
				organId: auc?.id ?? '',
			},
		],
	})

	// Floor
	const buildingA = await prisma.location.findFirst({
		where: { name: 'Building A' },
		select: { id: true },
	})

	// Incident Type
	await prisma.incidentType.createMany({
		data: [
			{ name: 'Accident', code: 'Accident' },
			{ name: 'Theft', code: 'Theft' },
			{ name: 'Fire', code: 'Fire' },
			{ name: 'Injury', code: 'Injury' },
			{ name: 'Harassment', code: 'Harassment' },
			{ name: 'Other', code: 'Other' },
		],
	})

	await prisma.floor.createMany({
		data: [
			{ name: 'Ground Floor', code: 'GF', locationId: buildingA?.id ?? '' },
			{ name: 'First Floor', code: '1F', locationId: buildingA?.id ?? '' },
			{ name: 'Second Floor', code: '2F', locationId: buildingA?.id ?? '' },
			{ name: 'Third Floor', code: '3F', locationId: buildingA?.id ?? '' },
		],
	})

	const buildingB = await prisma.location.findFirst({
		where: { name: 'Building B' },
		select: { id: true },
	})

	await prisma.floor.createMany({
		data: [
			{ name: 'Ground Floor', code: 'GF', locationId: buildingB?.id ?? '' },
			{ name: 'First Floor', code: '1F', locationId: buildingB?.id ?? '' },
			{ name: 'Second Floor', code: '2F', locationId: buildingB?.id ?? '' },
			{ name: 'Third Floor', code: '3F', locationId: buildingB?.id ?? '' },
		],
	})

	const buildingC = await prisma.location.findFirst({
		where: { name: 'Building C' },
		select: { id: true },
	})

	await prisma.floor.createMany({
		data: [
			{ name: 'Ground Floor', code: 'GF', locationId: buildingC?.id ?? '' },
			{ name: 'First Floor', code: '1F', locationId: buildingC?.id ?? '' },
			{ name: 'Second Floor', code: '2F', locationId: buildingC?.id ?? '' },
			{ name: 'Third Floor', code: '3F', locationId: buildingC?.id ?? '' },
		],
	})

	const occ = await prisma.location.findFirst({
		where: { name: 'Old Conference Center' },
		select: { id: true },
	})

	await prisma.floor.createMany({
		data: [
			{ name: 'Ground Floor', code: 'GF', locationId: occ?.id ?? '' },
			{ name: 'First Floor', code: '1F', locationId: occ?.id ?? '' },
			{ name: 'Second Floor', code: '2F', locationId: occ?.id ?? '' },
			{ name: 'Third Floor', code: '3F', locationId: occ?.id ?? '' },
		],
	})

	const ncc = await prisma.location.findFirst({
		where: { name: 'New Conference Center' },
		select: { id: true },
	})

	await prisma.floor.createMany({
		data: [
			{ name: 'Ground Floor', code: 'GF', locationId: ncc?.id ?? '' },
			{ name: 'First Floor', code: '1F', locationId: ncc?.id ?? '' },
			{ name: 'Second Floor', code: '2F', locationId: ncc?.id ?? '' },
			{ name: 'Third Floor', code: '3F', locationId: ncc?.id ?? '' },
		],
	})

	// Create relationship
	await prisma.relationship.createMany({
		data: [
			{ name: 'Sibling', code: 'Sibling' },
			{ name: 'Spouse', code: 'Spouse' },
			{ name: 'Child', code: 'Child' },
			{ name: 'Other', code: 'Other' },
			{ name: 'Mother', code: 'Mother' },
			{ name: 'Father', code: 'Father' },
		],
	})

	console.timeEnd(`🐨 Created lookup data"`)

	console.time(`🐨 Created admin user "binalfewk"`)
	await prisma.user.create({
		data: {
			email: 'binalfewk@africa-union.org',
			username: 'binalfewk',
			name: 'Binalfew',
			password: {
				create: createPassword('password'),
			},
			roles: {
				connect: [{ name: 'admin' }, { name: 'user' }],
			},
		},
	})

	// Reset access request counter
	await prisma.accessRequestCounter.create({
		data: {
			lastCounter: 0,
		},
	})

	console.timeEnd(`🐨 Created admin user "binalfewk"`)

	// Create user with 'user' role
	const users = ['binalfew', 'makida', 'kebron', 'maidot', 'lemlem']
	for (const user of users) {
		console.time(`🐨 Created user "${user}"`)
		await prisma.user.create({
			data: {
				email: `${user}@staffwise.com`,
				username: user,
				name: user.charAt(0).toUpperCase() + user.slice(1),
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
