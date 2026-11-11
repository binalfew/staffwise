// Release 1.7: default departments for organs with no department structure
// (plan Item 6, Q3). Each such organ gets "Admin and Finance" and "Other".
//
//   npx tsx prisma/scripts/add-default-departments.ts            # dry run
//   npx tsx prisma/scripts/add-default-departments.ts --apply    # write (local)
//   ... --apply --remote                                         # write (prod, after a backup)
//
// An organ qualifies when it has no departments, or only these defaults, so a
// second run creates nothing. Organs with their own departments are skipped.
// Staff stay linked to their current department; nobody is moved.

import { PrismaClient } from '@prisma/client'
import { apply, checkTarget, normalize } from './lib'

// Same name and code style as the existing "Admin and Finance" department.
const DEFAULTS = ['Admin and Finance', 'Other']
const defaultKeys = new Set(DEFAULTS.map(normalize))

const prisma = new PrismaClient()

async function main() {
	checkTarget()

	const organs = await prisma.organ.findMany({
		select: {
			id: true,
			code: true,
			name: true,
			departments: { select: { name: true } },
			_count: { select: { employees: true } },
		},
		orderBy: { name: 'asc' },
	})

	const plan = organs
		.filter(o => o.departments.every(d => defaultKeys.has(normalize(d.name))))
		.map(o => {
			const have = new Set(o.departments.map(d => normalize(d.name)))
			return {
				organ: o,
				missing: DEFAULTS.filter(n => !have.has(normalize(n))),
			}
		})
	const toCreate = plan.filter(p => p.missing.length > 0)
	const staff = plan.reduce((n, p) => n + p.organ._count.employees, 0)

	console.log(
		`Organs: ${organs.length}. Without their own departments: ${plan.length}. Needing defaults: ${toCreate.length}.`,
	)
	for (const { organ, missing } of plan) {
		const status = missing.length ? `+ ${missing.join(', ')}` : '= done'
		console.log(
			`  ${status.padEnd(26)} ${organ.code} (${organ._count.employees} staff)`,
		)
	}
	console.log(
		`\n${staff} staff in these organs keep their current department; they pick a new one the next time they edit their duty station.`,
	)

	if (!apply || toCreate.length === 0) return

	const data = toCreate.flatMap(({ organ, missing }) =>
		missing.map(name => ({ name, code: name, organId: organ.id })),
	)
	await prisma.department.createMany({ data })
	console.log(
		`\nCreated ${data.length} departments in ${toCreate.length} organs.`,
	)
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
