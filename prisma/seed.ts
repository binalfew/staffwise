import fsExtra from 'fs-extra'
import * as path from 'node:path'
import { createPassword, prisma } from '~/utils/db.server'

import { isValid, parse } from 'date-fns'

const parseDate = (dateString: string | null): Date | undefined => {
	if (!dateString) return undefined
	const parsedDate = parse(dateString, 'yyyy-MM-dd HH:mm:ss.SSS', new Date())
	return isValid(parsedDate) ? parsedDate : undefined
}

const cwd = process.cwd()
const inputDir = path.join(cwd, 'prisma', 'data')

export async function truncate() {
	console.time('🧹 Cleaned up the database...')

	await prisma.dependant.deleteMany()
	await prisma.spouse.deleteMany()
	await prisma.vehicle.deleteMany()
	// await prisma.assessment.deleteMany()
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
	await prisma.counter.deleteMany()
	await prisma.visitor.deleteMany()
	await prisma.vehicle.deleteMany()
	// await prisma.assessment.deleteMany()
	await prisma.incident.deleteMany()
	await prisma.employeeIdRequest.deleteMany()
	await prisma.dependantIdRequest.deleteMany()
	await prisma.spouseIdRequest.deleteMany()
	await prisma.privateDriverIdRequest.deleteMany()
	await prisma.libraryUserIdRequest.deleteMany()
	await prisma.retireeIdRequest.deleteMany()

	await prisma.dependant.deleteMany()
	await prisma.spouse.deleteMany()
	await prisma.accessRequest.deleteMany()
	await prisma.idRequest.deleteMany()
	await prisma.carPassRequest.deleteMany()
	await prisma.employee.deleteMany()
	await prisma.password.deleteMany()
	await prisma.user.deleteMany()

	console.timeEnd('🧹 Cleaned up the database...')
}

export async function seedRolesAndPermission() {
	console.time(`🐨 Created roles and permissions...`)
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
		'php',
		'accessRequest',
		'idRequest',
		'carPassRequest',
		'counter',
		'employee',
		'dependant',
		'spouse',
		'employeeIdRequest',
		'dependantIdRequest',
		'spouseIdRequest',
		'privateDriverIdRequest',
		'libraryUserIdRequest',
		'retireeIdRequest',
		'employeeCarPassRequest',
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
	const allPermissions = await prisma.permission.findMany({
		select: { id: true },
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
				connect: allPermissions,
			},
		},
	})

	// Create idRequestAdmin role
	const idRequestsPermissions = await prisma.permission.findMany({
		select: { id: true },
		where: { entity: 'idRequest' },
	})

	await prisma.role.create({
		data: {
			name: 'idRequestAdmin',
			description: 'idRequestAdmin',
			permissions: {
				connect: idRequestsPermissions,
			},
		},
	})

	// Create incidentAdmin role
	const incidentPermissions = await prisma.permission.findMany({
		select: { id: true },
		where: { entity: 'incident' },
	})

	await prisma.role.create({
		data: {
			name: 'incidentAdmin',
			description: 'incidentAdmin',
			permissions: {
				connect: incidentPermissions,
			},
		},
	})

	// Create accessRequestAdmin role
	const accessRequestPermissions = await prisma.permission.findMany({
		select: { id: true },
		where: { entity: 'accessRequest' },
	})
	await prisma.role.create({
		data: {
			name: 'accessRequestAdmin',
			description: 'accessRequestAdmin',
			permissions: {
				connect: accessRequestPermissions,
			},
		},
	})

	// Create carPassAdmin role
	const carPassPermissions = await prisma.permission.findMany({
		select: { id: true },
		where: { entity: 'carPassRequest' },
	})
	await prisma.role.create({
		data: {
			name: 'carPassAdmin',
			description: 'carPassAdmin',
			permissions: {
				connect: carPassPermissions,
			},
		},
	})

	// Create phpAdmin role
	const phpPermissions = await prisma.permission.findMany({
		select: { id: true },
		where: { entity: 'php' },
	})
	await prisma.role.create({
		data: {
			name: 'phpAdmin',
			description: 'phpAdmin',
			permissions: {
				connect: phpPermissions,
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

	console.timeEnd('🐨 Created roles and permissions...')
}

export async function seedAdminUser() {
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
				connect: [
					{ name: 'admin' },
					{ name: 'idRequestAdmin' },
					{ name: 'incidentAdmin' },
					{ name: 'accessRequestAdmin' },
					{ name: 'carPassAdmin' },
					{ name: 'phpAdmin' },
					{ name: 'user' },
				],
			},
		},
	})

	console.timeEnd(`🐨 Created admin user "binalfewk"`)
}

export async function seedLookups() {
	console.time(`🐨 Created lookup data"`)
	const [stations, locations, departments, countries, floors, relationships] =
		await Promise.all([
			fsExtra.readJSON(path.join(inputDir, 'stations.json')),
			fsExtra.readJSON(path.join(inputDir, 'locations.json')),
			fsExtra.readJSON(path.join(inputDir, 'departments.json')),
			fsExtra.readJSON(path.join(inputDir, 'countries.json')),
			fsExtra.readJSON(path.join(inputDir, 'floors.json')),
			fsExtra.readJSON(path.join(inputDir, 'relationships.json')),
		])

	await prisma.relationship.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})
	await prisma.relationship.createMany({
		data: relationships.map((relationship: any) => {
			return {
				name: relationship.Name.replace(/\t|\n/g, '').trim(),
				code: relationship.Name.replace(/\t|\n/g, '').trim(),
			}
		}),
	})

	const unknownCountry = await prisma.country.create({
		data: {
			name: 'Unknown',
			code: 'Unknown',
			isMemberState: false,
		},
	})
	await prisma.country.createMany({
		data: countries
			.filter((country: any) => country.Name !== '-')
			.map((country: any) => {
				return {
					name: country.Name.replace(/\t|\n/g, '').trim(),
					code: country.Code.replace(/\t|\n/g, '').trim(),
					isMemberState: country.IsMemberState === '1' ? true : false,
				}
			}),
	})

	const unknownOrgan = await prisma.organ.create({
		data: {
			name: 'Unknown',
			code: 'Unknown',
			address: 'Unknown',
			countryId: unknownCountry.id,
		},
	})
	await prisma.organ.createMany({
		data: await Promise.all(
			stations.map(async (station: any) => {
				const country = await prisma.country.findFirst({
					where: { name: station.Country.trim() },
					select: { id: true },
				})
				return {
					name: station.Name.trim(),
					code: station.Code.trim(),
					countryId: country?.id ?? null,
					address: station.City.trim(),
				}
			}),
		),
	})

	const auc = await prisma.organ.findFirst({
		where: { name: 'AU Headquarters' },
		select: { id: true },
	})

	await prisma.department.create({
		data: {
			name: 'Unknown',
			code: 'Unknown',
			organId: unknownOrgan.id,
		},
	})
	await prisma.department.createMany({
		data: departments
			.filter((department: any) => department.Name !== '-')
			.map((department: any) => {
				return {
					name: department.Name.replace(/\t|\n/g, '').trim(),
					code: department.Code.replace(/\t|\n/g, '').trim(),
					organId: auc?.id ?? '',
				}
			}),
	})

	// Create unknown location
	const unknownLocation = await prisma.location.create({
		data: {
			name: 'Unknown',
			code: 'Unknown',
			organId: unknownOrgan.id,
		},
	})
	await prisma.location.createMany({
		data: locations.map((location: any) => {
			return {
				name: location.Name.replace(/\t|\n/g, '').trim(),
				code: location.Code.replace(/\t|\n/g, '').trim(),
				organId: auc?.id ?? '',
			}
		}),
	})

	const ncc = await prisma.location.findFirst({
		where: { name: 'NCC' },
		select: { id: true },
	})

	await prisma.floor.create({
		data: {
			name: 'Unknown',
			code: 'Unknown',
			locationId: unknownLocation.id,
		},
	})
	await prisma.floor.createMany({
		data: floors.map((floor: any) => {
			return {
				name: floor.Name.replace(/\t|\n/g, '').trim(),
				code: floor.Name.replace(/\t|\n/g, '').trim(),
				locationId: ncc?.id ?? '',
			}
		}),
	})

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

	await prisma.counter.createMany({
		data: [
			{
				lastCounter: 0,
				type: 'ACCESSREQUEST',
			},
			{
				lastCounter: 0,
				type: 'INCIDENT',
			},
			{
				lastCounter: 0,
				type: 'IDREQUEST',
			},
			{
				lastCounter: 0,
				type: 'CARPASSREQUEST',
			},
		],
	})

	console.timeEnd(`🐨 Created lookup data"`)
}

// export async function seedEmployees() {
// 	const data = await fsExtra.readJSON(path.join(inputDir, 'employees.json'))

// 	// Filter unique employees
// 	const allEmployees = data.employees
// 	const uniqueEmails = new Set()
// 	const employees = allEmployees.filter((employee: any) => {
// 		if (!uniqueEmails.has(employee.Email)) {
// 			uniqueEmails.add(employee.Email)
// 			return true
// 		}
// 		return false
// 	})

// 	const unknownCountry = await prisma.country.findFirst({
// 		where: { name: 'Unknown' },
// 		select: { id: true },
// 	})

// 	const unknownOrgan = await prisma.organ.findFirst({
// 		where: { name: 'Unknown' },
// 		select: { id: true },
// 	})

// 	const unknownLocation = await prisma.location.findFirst({
// 		where: { name: 'Unknown' },
// 		select: { id: true },
// 	})

// 	const unknownFloor = await prisma.floor.findFirst({
// 		where: { name: 'Unknown' },
// 		select: { id: true },
// 	})

// 	const unknownDepartment = await prisma.department.findFirst({
// 		where: { name: 'Unknown' },
// 		select: { id: true },
// 	})

// 	await prisma.employee.createMany({
// 		data: await Promise.all(
// 			employees.map(async (employee: any) => {
// 				// Country
// 				const country = await prisma.country.findFirst({
// 					where: { name: employee.country.Name.trim() },
// 					select: { id: true },
// 				})

// 				// Station
// 				const station = await prisma.organ.findFirst({
// 					where: { name: employee.station.Name.trim() },
// 					select: { id: true },
// 				})

// 				// Location
// 				let location = null
// 				if (employee.location) {
// 					location = await prisma.location.findFirst({
// 						where: { name: employee.location.Name.trim() },
// 						select: { id: true },
// 					})
// 				}

// 				// Floor
// 				let floor = null
// 				if (employee.floor) {
// 					floor = await prisma.floor.findFirst({
// 						where: { name: employee.floor.Name.trim() },
// 						select: { id: true },
// 					})
// 				}

// 				// Department
// 				const department = await prisma.department.findFirst({
// 					where: { name: employee.department.Name.trim() },
// 					select: { id: true },
// 				})

// 				const dependants = employee.dependants.map(async (dependant: any) => {
// 					const relationship = await prisma.relationship.findFirst({
// 						where: { name: dependant.relationship.Name.trim() },
// 						select: { id: true },
// 					})

// 					return {
// 						auIdNumber: dependant.AuIdNumber,
// 						firstName: dependant.FirstName,
// 						familyName: dependant.FamilyName,
// 						middleName: dependant.MiddleName,
// 						nameOfSchool: dependant.NameOfSchool,
// 						relationshipId: relationship?.id ?? '',
// 						dateOfBirth: parseDate(dependant.DateOfBirth),
// 					}
// 				})

// 				// Build employee object
// 				return {
// 					firstName: employee.FirstName,
// 					familyName: employee.FamilyName,
// 					middleName: employee.MiddleName,
// 					email: employee.Email,
// 					countryId: country?.id ?? unknownCountry?.id ?? '',
// 					organId: station?.id ?? unknownOrgan?.id ?? '',
// 					locationId: location?.id ?? unknownLocation?.id ?? '',
// 					floorId: floor?.id ?? unknownFloor?.id ?? '',
// 					departmentId: department?.id ?? unknownDepartment?.id ?? '',
// 					nationalPassportNumber: employee.NationalPassportNumber,
// 					auPassportNumber: employee.AuPassportNumber,
// 					auIdNumber: employee.AuIdNumber,
// 					dateIssued: parseDate(employee.DateIssued),
// 					validUntil: parseDate(employee.ValidUntil),
// 					dateOfBirth: parseDate(employee.DateOfBirth),
// 					officeNumber: employee.OfficeNumber,
// 					specialConditions: employee.SpecialCondition,
// 					medicallyTrained: employee.MedicallyTrained === '1' ? true : false,
// 					zone: employee.Zone,
// 					team: employee.Team,
// 					city: employee?.address?.City,
// 					subcity: employee?.address?.Subcity,
// 					woreda: employee?.address?.Woreda,
// 					street: employee?.address?.Street,
// 					kebele: employee?.address?.Kebele,
// 					houseNumber: employee?.address?.HouseNumber,
// 					houseTelephoneNumber: employee?.address?.HomeTelephone,
// 					mobileTelephoneNumber: employee?.address?.MobileTelephone,
// 					officeTelephoneNumber: employee?.address?.OfficeTelephone,
// 					specificLocation: employee?.address?.SpecificLocation,
// 					gpsLocation: employee?.address?.GpsCoordinates,
// 					homeCountryAddress: employee?.address?.HomeCountryAddress,
// 					dependant: {
// 						create: dependants,
// 					},
// 				}
// 			}),
// 		),
// 	})
// }

export async function seedEmployees() {
	const data = await fsExtra.readJSON(path.join(inputDir, 'employees.json'))

	// Filter unique employees
	const allEmployees = data.employees
	const uniqueEmails = new Set()
	const employees = allEmployees.filter((employee: any) => {
		if (!uniqueEmails.has(employee.Email)) {
			uniqueEmails.add(employee.Email)
			return true
		}
		return false
	})

	const unknownCountry = await prisma.country.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})

	const unknownOrgan = await prisma.organ.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})

	const unknownLocation = await prisma.location.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})

	const unknownFloor = await prisma.floor.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})

	const unknownDepartment = await prisma.department.findFirst({
		where: { name: 'Unknown' },
		select: { id: true },
	})

	for (const employee of employees) {
		// Country
		const country = await prisma.country.findFirst({
			where: { name: employee.country.Name.trim() },
			select: { id: true },
		})

		// Station
		const station = await prisma.organ.findFirst({
			where: { name: employee.station.Name.trim() },
			select: { id: true },
		})

		// Location
		let location = null
		if (employee.location) {
			location = await prisma.location.findFirst({
				where: { name: employee.location.Name.trim() },
				select: { id: true },
			})
		}

		// Floor
		let floor = null
		if (employee.floor) {
			floor = await prisma.floor.findFirst({
				where: { name: employee.floor.Name.trim() },
				select: { id: true },
			})
		}

		// Department
		const department = await prisma.department.findFirst({
			where: { name: employee.department.Name.trim() },
			select: { id: true },
		})

		// Dependants
		const dependants = await Promise.all(
			employee.dependants.map(async (dependant: any) => {
				const relationship = await prisma.relationship.findFirst({
					where: { name: dependant.relationship.Name.trim() },
					select: { id: true },
				})

				return {
					auIdNumber:
						dependant.AuIdNumber === 'NULL' ? null : dependant.AuIdNumber,
					firstName: dependant.FirstName,
					familyName: dependant.FamilyName,
					middleName: dependant.MiddleName,
					nameOfSchool:
						dependant.NameOfSchool === 'NULL' ? null : dependant.NameOfSchool,
					relationshipId: relationship?.id ?? '',
					dateOfBirth: parseDate(dependant.DateOfBirth),
				}
			}),
		)

		// Spouses
		const spouses = await Promise.all(
			employee.spouses.map(async (spouse: any) => {
				return {
					firstName: spouse.FirstName,
					familyName: spouse.FamilyName,
					middleName: spouse.MiddleName,
					dateOfBirth: parseDate(spouse.DateOfBirth),
					auIdNumber: spouse.AuIdNumber === 'NULL' ? null : spouse.AuIdNumber,
					dateIssued: parseDate(spouse.DateIssued),
					validUntil: parseDate(spouse.ValidUntil),
					telephoneNumber:
						spouse.Telephone === 'NULL' ? null : spouse.Telephone,
				}
			}),
		)

		// Create the employee with dependants
		await prisma.employee.create({
			data: {
				firstName: employee.FirstName,
				familyName: employee.FamilyName,
				middleName: employee.MiddleName,
				email: employee.Email,
				countryId: country?.id ?? unknownCountry?.id ?? '',
				organId: station?.id ?? unknownOrgan?.id ?? '',
				locationId: location?.id ?? unknownLocation?.id ?? '',
				floorId: floor?.id ?? unknownFloor?.id ?? '',
				departmentId: department?.id ?? unknownDepartment?.id ?? '',
				nationalPassportNumber: employee.NationalPassportNumber,
				auPassportNumber: employee.AuPassportNumber,
				auIdNumber: employee.AuIdNumber,
				dateIssued: parseDate(employee.DateIssued),
				validUntil: parseDate(employee.ValidUntil),
				dateOfBirth: parseDate(employee.DateOfBirth),
				officeNumber: employee.OfficeNumber,
				specialConditions: employee.SpecialCondition,
				medicallyTrained: employee.MedicallyTrained === '1' ? true : false,
				zone: employee.Zone === 'NULL' ? null : employee.Zone,
				team: employee.Team === 'NULL' ? null : employee.Team,
				city:
					employee?.address?.City === 'NULL' ? null : employee?.address?.City,
				subcity: employee?.address?.Subcity,
				woreda:
					employee?.address?.Woreda === 'NULL'
						? null
						: employee?.address?.Woreda,
				street:
					employee?.address?.Street === 'NULL'
						? null
						: employee?.address?.Street,
				kebele:
					employee?.address?.Kebele === 'NULL'
						? null
						: employee?.address?.Kebele,
				houseNumber:
					employee?.address?.HouseNumber === 'NULL'
						? null
						: employee?.address?.HouseNumber,
				houseTelephoneNumber:
					employee?.address?.HomeTelephone === 'NULL'
						? null
						: employee?.address?.HomeTelephone,
				mobileTelephoneNumber:
					employee?.address?.MobileTelephone === 'NULL'
						? null
						: employee?.address?.MobileTelephone,
				officeTelephoneNumber:
					employee?.address?.OfficeTelephone === 'NULL'
						? null
						: employee?.address?.OfficeTelephone,
				specificLocation:
					employee?.address?.SpecificLocation === 'NULL'
						? null
						: employee?.address?.SpecificLocation,
				gpsLocation:
					employee?.address?.GpsCoordinates === 'NULL'
						? null
						: employee?.address?.GpsCoordinates,
				homeCountryAddress:
					employee?.address?.HomeCountryAddress === 'NULL'
						? null
						: employee?.address?.HomeCountryAddress,
				dependants: {
					create: dependants,
				},
				spouses: {
					create: spouses,
				},
			},
		})
	}
}

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)
	await truncate()
	// await seedRolesAndPermission()
	// await seedAdminUser()
	// await seedLookups()
	// await seedEmployees()
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
