import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { OrganEditor } from './__organ-editor'
export { action } from './__organ-editor.server'

export async function loader() {
	const countries = await prisma.country.findMany({
		select: { id: true, name: true },
	})

	return json({ countries })
}

export default function AddOrganRoute() {
	const { countries } = useLoaderData<typeof loader>()
	return <OrganEditor title="Add Organ" countries={countries} />
}
