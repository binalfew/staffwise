import { createPassword, createUser, prisma } from '~/utils/db.server'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await prisma.user.deleteMany()
	console.timeEnd('🧹 Cleaned up the database...')

	const totalUsers = 3
	console.time(`👤 Created ${totalUsers} users...`)

	for (let index = 0; index < totalUsers; index++) {
		const user = createUser()
		await prisma.user
			.create({
				select: { id: true },
				data: {
					...user,
					password: { create: createPassword(user.username) },
				},
			})
			.catch(e => {
				console.error('Error creating a user:', e)
				return null
			})
	}
	console.timeEnd(`👤 Created ${totalUsers} users...`)

	console.time(`🐨 Created admin user "binalfew"`)
	await prisma.user.create({
		data: {
			email: 'binalfew@staffwise.com',
			username: 'binalfew',
			name: 'Binalfew',
			password: {
				create: createPassword('password'),
			},
		},
	})
	console.timeEnd(`🐨 Created admin user "binalfew"`)

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
