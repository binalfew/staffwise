// Shared helpers for the data-import scripts in prisma/scripts.
// Every script is a dry run unless --apply is passed, and refuses to write to
// a non-local database unless --remote is passed as well.

export const args = new Set(process.argv.slice(2))
export const apply = args.has('--apply')

export function checkTarget() {
	const url = process.env.DATABASE_URL
	if (!url) throw new Error('DATABASE_URL is not set')
	const { hostname, pathname } = new URL(url)
	const local = hostname === 'localhost' || hostname === '127.0.0.1'
	console.log(`Database: ${hostname}${pathname}${local ? ' (local)' : ''}`)
	console.log(
		apply
			? 'Mode: APPLY (changes will be written)\n'
			: 'Mode: dry run (nothing is written; pass --apply to write)\n',
	)
	if (apply && !local && !args.has('--remote')) {
		throw new Error(
			'Refusing to write to a non-local database. Back it up first, then add --remote.',
		)
	}
}

// Compare names ignoring case, extra spaces, curly quotes and dash styles.
export function normalize(name: string) {
	return name
		.normalize('NFC')
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[–—]/g, '-')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase()
}
