// One-off: merge the two League of Arab States office records (plan Item 5).
//
//   npx tsx prisma/scripts/merge-las-office.ts            # dry run
//   npx tsx prisma/scripts/merge-las-office.ts --apply    # write (local)
//   ... --apply --remote                                  # write (prod, after a backup)
//
// Keeps the "+20" record, which has the office's own departments, renames it
// and gives it an "Other" department. Staff of every "Cairo Office" duplicate
// (production has two, coded +20 and 20) move to that "Other"; the duplicates'
// departments and the duplicates themselves are then deleted. Running it
// again changes nothing.

import { PrismaClient } from '@prisma/client'
import { apply, checkTarget, normalize } from './lib'

const TARGET = {
	name: 'AU Permanent Representative to the League of Arab States',
	code: 'AU-LAS',
}
const KEEP_NAMES = [
	'AU Permanent Representative Mission League Arab States',
	TARGET.name,
]
const DUPLICATE_NAME =
	'Permanent Delegation to the League of Arab States – Cairo Office'
const STAFF_DEPARTMENT = 'Other'

const prisma = new PrismaClient()

const organSelect = {
	id: true,
	name: true,
	code: true,
	departments: { select: { id: true, name: true } },
	_count: { select: { employees: true, locations: true } },
} as const

async function findByName(names: string[]) {
	const keys = new Set(names.map(normalize))
	const organs = await prisma.organ.findMany({ select: organSelect })
	return organs.filter(o => keys.has(normalize(o.name)))
}

async function main() {
	checkTarget()

	const keeps = await findByName(KEEP_NAMES)
	const dups = await findByName([DUPLICATE_NAME])
	if (keeps.length !== 1) {
		throw new Error(`Expected 1 organ to keep, found ${keeps.length}`)
	}
	const keep = keeps[0]
	for (const dup of dups) {
		if (dup._count.locations > 0) {
			throw new Error(`${dup.code} has locations; merge them by hand first`)
		}
	}

	const rename = keep.name !== TARGET.name || keep.code !== TARGET.code
	const hasOther = keep.departments.some(
		d => normalize(d.name) === normalize(STAFF_DEPARTMENT),
	)

	console.log(
		`Keep:      ${keep.code} "${keep.name}" (${
			keep._count.employees
		} staff; ${keep.departments.map(d => d.name).join(', ')})`,
	)
	console.log(
		rename
			? `  rename → ${TARGET.code} "${TARGET.name}"`
			: '  name and code already set',
	)
	console.log(
		hasOther
			? `  already has "${STAFF_DEPARTMENT}"`
			: `  + department "${STAFF_DEPARTMENT}"`,
	)
	if (dups.length === 0) console.log('Duplicates: none left')
	for (const dup of dups) {
		console.log(
			`Duplicate: ${dup.code} "${dup.name}" [${dup.id}] (${
				dup._count.employees
			} staff → "${STAFF_DEPARTMENT}"; delete departments ${dup.departments
				.map(d => d.name)
				.join(', ')}; delete organ)`,
		)
	}

	if (!apply || (!rename && hasOther && dups.length === 0)) return

	await prisma.$transaction(async tx => {
		if (rename) {
			await tx.organ.update({ where: { id: keep.id }, data: TARGET })
		}
		const other =
			keep.departments.find(
				d => normalize(d.name) === normalize(STAFF_DEPARTMENT),
			) ??
			(await tx.department.create({
				data: {
					name: STAFF_DEPARTMENT,
					code: STAFF_DEPARTMENT,
					organId: keep.id,
				},
				select: { id: true, name: true },
			}))
		for (const dup of dups) {
			const moved = await tx.employee.updateMany({
				where: { organId: dup.id },
				data: { organId: keep.id, departmentId: other.id },
			})
			// Staff of other organs can't point at the duplicate's departments
			// (the forms don't allow it), but check before deleting.
			const stillLinked = await tx.employee.count({
				where: { department: { organId: dup.id } },
			})
			if (stillLinked > 0) {
				throw new Error(
					`${stillLinked} employees still use ${dup.code} departments`,
				)
			}
			const admins = await tx.organAdmin.findMany({
				where: { organId: dup.id },
				select: { userId: true },
			})
			await tx.organAdmin.createMany({
				data: admins.map(({ userId }) => ({ userId, organId: keep.id })),
				skipDuplicates: true,
			})
			await tx.department.deleteMany({ where: { organId: dup.id } })
			await tx.organ.delete({ where: { id: dup.id } })
			console.log(
				`Moved ${moved.count} staff, ${admins.length} office admins; deleted ${dup.code} [${dup.id}].`,
			)
		}
	})
	console.log('Done.')
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
