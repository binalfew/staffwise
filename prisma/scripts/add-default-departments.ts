// Release 1.7: default departments for organs with no department structure
// (plan Item 6, Q3). Each such organ gets "Admin and Finance" and "Other".
//
//   npx tsx prisma/scripts/add-default-departments.ts            # dry run
//   npx tsx prisma/scripts/add-default-departments.ts --apply    # write (local)
//   ... --apply --remote                                         # write (prod, after a backup)
//
// An organ qualifies when it has no departments, or only these defaults, so a
// second run changes nothing. Organs with their own departments are skipped.
// Staff in these organs who are linked to another organ's department (usually
// their HQ parent department) move to their own organ's "Other" (Q3).

import { PrismaClient } from '@prisma/client'
import { apply, checkTarget, normalize } from './lib'

// Same name and code style as the existing "Admin and Finance" department.
const DEFAULTS = ['Admin and Finance', 'Other']
const STAFF_DEFAULT = 'Other'
const defaultKeys = new Set(DEFAULTS.map(normalize))

const prisma = new PrismaClient()

async function main() {
	checkTarget()

	const organs = await prisma.organ.findMany({
		select: {
			id: true,
			code: true,
			departments: { select: { id: true, name: true } },
			employees: { select: { departmentId: true } },
		},
		orderBy: { name: 'asc' },
	})

	const plan = organs
		.filter(o => o.departments.every(d => defaultKeys.has(normalize(d.name))))
		.map(o => {
			const have = new Set(o.departments.map(d => normalize(d.name)))
			const own = new Set(o.departments.map(d => d.id))
			return {
				organ: o,
				missing: DEFAULTS.filter(n => !have.has(normalize(n))),
				toMove: o.employees.filter(e => !own.has(e.departmentId)).length,
			}
		})
	const toCreate = plan.filter(p => p.missing.length > 0)
	const toMove = plan.filter(p => p.toMove > 0)
	const moveCount = toMove.reduce((n, p) => n + p.toMove, 0)

	console.log(
		`Organs: ${organs.length}. Without their own departments: ${plan.length}. ` +
			`Needing defaults: ${toCreate.length}. Staff to move to "${STAFF_DEFAULT}": ${moveCount}.`,
	)
	for (const { organ, missing, toMove } of plan) {
		const status = missing.length ? `+ ${missing.join(', ')}` : '= has defaults'
		const move = toMove ? `, move ${toMove} staff` : ''
		console.log(`  ${status.padEnd(26)} ${organ.code}${move}`)
	}

	if (!apply || (toCreate.length === 0 && toMove.length === 0)) return

	const data = toCreate.flatMap(({ organ, missing }) =>
		missing.map(name => ({ name, code: name, organId: organ.id })),
	)
	const moved = await prisma.$transaction(async tx => {
		await tx.department.createMany({ data })
		let count = 0
		for (const { organ } of toMove) {
			const other = await tx.department.findFirstOrThrow({
				where: { organId: organ.id, name: STAFF_DEFAULT },
				select: { id: true },
			})
			const result = await tx.employee.updateMany({
				where: {
					organId: organ.id,
					department: { organId: { not: organ.id } },
				},
				data: { departmentId: other.id },
			})
			count += result.count
		}
		return count
	})
	console.log(
		`\nCreated ${data.length} departments in ${toCreate.length} organs. ` +
			`Moved ${moved} staff to "${STAFF_DEFAULT}".`,
	)
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
