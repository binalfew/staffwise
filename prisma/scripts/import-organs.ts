// Release 1.5: clean up and complete the organ list (plan Item 5, Appendix B).
//
//   npx tsx prisma/scripts/import-organs.ts                    # dry run
//   npx tsx prisma/scripts/import-organs.ts --apply            # creates and updates (local)
//   npx tsx prisma/scripts/import-organs.ts --apply --merge    # also merges duplicates
//   ... --remote                                               # allow prod, after a backup
//
// For each entry in data/organs.json, the existing organs named `name` or any
// of `match` (ignoring case, spacing, quote and dash style) are the same organ:
// - none: the organ is created, with the city as its address;
// - one or more: the one with the most employees is kept and gets the entry's
//   name and code. With --merge, the others have their employees moved to it
//   and are then deleted. A duplicate is only merged when it has no
//   departments or locations of its own, so no employee loses a link.
// Entries with `hold` are skipped. Addresses and countries of existing organs
// are never changed; a country mismatch is reported. Departments are not
// added: organs without departments let staff pick their HQ department.

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { apply, args, checkTarget, normalize } from './lib'

type Entry = {
	name: string
	code: string
	country: string
	city: string
	match?: string[]
	hold?: string
	note?: string
}

const { organs: entries } = JSON.parse(
	readFileSync(new URL('./data/organs.json', import.meta.url), 'utf8'),
) as { organs: Entry[] }

const merge = args.has('--merge')
const prisma = new PrismaClient()

async function main() {
	checkTarget()

	const organs = await prisma.organ.findMany({
		select: {
			id: true,
			name: true,
			code: true,
			createdAt: true,
			country: { select: { name: true } },
			_count: {
				select: { departments: true, locations: true, employees: true },
			},
		},
	})
	const countries = await prisma.country.findMany({
		where: { isDeleted: false },
		select: { id: true, name: true },
	})
	const countryId = new Map(countries.map(c => [normalize(c.name), c.id]))

	const creates: Array<Entry & { countryId: string }> = []
	const updates: Array<{ id: string; name: string; code: string }> = []
	const merges: Array<{ fromId: string; toId: string; employees: number }> = []
	const claimed = new Map<string, string>()
	const problems: string[] = []

	for (const entry of entries) {
		if (entry.hold) {
			console.log(`  ~ HOLD ${entry.name}: ${entry.hold}`)
			continue
		}
		const keys = new Set([entry.name, ...(entry.match ?? [])].map(normalize))
		const found = organs
			.filter(o => keys.has(normalize(o.name)))
			.sort(
				(a, b) =>
					b._count.employees - a._count.employees ||
					b._count.departments - a._count.departments ||
					a.createdAt.getTime() - b.createdAt.getTime(),
			)

		for (const o of found) {
			const other = claimed.get(o.id)
			if (other)
				problems.push(`"${o.name}" matches both "${other}" and "${entry.name}"`)
			claimed.set(o.id, entry.name)
		}

		if (found.length === 0) {
			const id = countryId.get(normalize(entry.country))
			if (!id) {
				problems.push(
					`Country "${entry.country}" not found (for "${entry.name}")`,
				)
				continue
			}
			creates.push({ ...entry, countryId: id })
			console.log(
				`  + ${entry.name} [${entry.code}] ${entry.city}, ${entry.country}`,
			)
			continue
		}

		const [keep, ...duplicates] = found
		const changes = []
		if (keep.name !== entry.name)
			changes.push(`name "${keep.name}" -> "${entry.name}"`)
		if (keep.code !== entry.code)
			changes.push(`code "${keep.code}" -> "${entry.code}"`)
		if (changes.length) {
			updates.push({ id: keep.id, name: entry.name, code: entry.code })
			console.log(`  * ${entry.name}: ${changes.join(', ')}`)
		} else {
			console.log(`  = ${entry.name}`)
		}
		if (normalize(keep.country.name) !== normalize(entry.country)) {
			console.log(
				`      ! country is "${keep.country.name}", list says "${entry.country}" (not changed)`,
			)
		}
		if (entry.note) console.log(`      note: ${entry.note}`)

		for (const dup of duplicates) {
			const label = `"${dup.name}" [${dup.code}] (${dup._count.employees} employees)`
			if (dup._count.departments || dup._count.locations) {
				console.log(
					`      ! not merging ${label}: it has its own departments or locations`,
				)
			} else if (keep._count.departments && dup._count.employees) {
				console.log(
					`      ! not merging ${label}: its staff would have to pick a new department`,
				)
			} else {
				merges.push({
					fromId: dup.id,
					toId: keep.id,
					employees: dup._count.employees,
				})
				console.log(`      - merge duplicate ${label}`)
			}
		}
	}

	const unlisted = organs.filter(o => !claimed.has(o.id))
	if (unlisted.length) {
		console.log('\nExisting organs not in the list (kept as they are):')
		for (const o of unlisted) {
			console.log(
				`  ? ${o.name} [${o.code}] (${o._count.employees} employees, ${o._count.departments} departments)`,
			)
		}
	}

	const moved = merges.reduce((sum, m) => sum + m.employees, 0)
	console.log(
		`\nCreate ${creates.length}, update ${updates.length}, merge ${
			merges.length
		} duplicates (${moved} employees moved)${
			merge ? '' : ' (merges need --merge)'
		}.`,
	)

	if (problems.length) {
		console.log('\nProblems (fix the data file; nothing will be written):')
		for (const p of problems) console.log(`  x ${p}`)
		process.exitCode = 1
		return
	}
	if (!apply) return

	await prisma.$transaction(
		async tx => {
			for (const c of creates) {
				await tx.organ.create({
					data: {
						name: c.name,
						code: c.code,
						address: c.city,
						countryId: c.countryId,
					},
				})
			}
			for (const u of updates) {
				await tx.organ.update({
					where: { id: u.id },
					data: { name: u.name, code: u.code },
				})
			}
			if (!merge) return
			for (const m of merges) {
				await tx.employee.updateMany({
					where: { organId: m.fromId },
					data: { organId: m.toId },
				})
				await tx.organ.delete({ where: { id: m.fromId } })
			}
		},
		{ timeout: 60_000 },
	)
	console.log(`Done.${merge ? '' : ' Duplicates were not merged.'}`)
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
