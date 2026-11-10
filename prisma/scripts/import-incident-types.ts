// Release 1.4: add the approved incident types (plan Item 4, Appendix A).
//
//   npx tsx prisma/scripts/import-incident-types.ts            # dry run
//   npx tsx prisma/scripts/import-incident-types.ts --apply    # write (local)
//   ... --apply --remote                                       # write (prod, after a backup)
//
// Only inserts. A type whose name already exists (ignoring case, spacing and
// dash style) is left untouched, so running it twice changes nothing.
// Existing types that aren't in the list are reported, never changed.

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { apply, checkTarget, normalize } from './lib'

type Row = { name: string; category: string }

const { types } = JSON.parse(
	readFileSync(new URL('./data/incident-types.json', import.meta.url), 'utf8'),
) as { types: Row[] }

const prisma = new PrismaClient()

async function main() {
	checkTarget()

	const seen = new Set<string>()
	for (const { name } of types) {
		const key = normalize(name)
		if (seen.has(key)) throw new Error(`Duplicate in data file: ${name}`)
		seen.add(key)
	}

	const existing = await prisma.incidentType.findMany({
		select: { name: true, _count: { select: { incidents: true } } },
	})
	const existingKeys = new Set(existing.map(t => normalize(t.name)))

	const toCreate = types.filter(t => !existingKeys.has(normalize(t.name)))
	const present = types.filter(t => existingKeys.has(normalize(t.name)))
	const notInList = existing.filter(t => !seen.has(normalize(t.name)))

	console.log(
		`In list: ${types.length}. Already present: ${present.length}. To create: ${toCreate.length}.`,
	)
	for (const t of present) console.log(`  = ${t.name}`)
	for (const t of toCreate) console.log(`  + ${t.name}  [${t.category}]`)

	if (notInList.length) {
		console.log('\nExisting types not in the list (kept as they are):')
		for (const t of notInList) {
			console.log(`  ? ${t.name} (${t._count.incidents} incidents)`)
		}
	}

	if (!apply || toCreate.length === 0) return

	// Existing types use the name as the code, so do the same.
	await prisma.incidentType.createMany({
		data: toCreate.map(t => ({ name: t.name, code: t.name })),
	})
	console.log(`\nCreated ${toCreate.length} incident types.`)
}

main()
	.catch(error => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
