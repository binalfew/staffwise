import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { LocationEditor } from './__location-editor'
export { action } from './__location-editor.server'

export async function loader() {
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	return json({ organs })
}

export default function AddLocationRoute() {
	const { organs } = useLoaderData<typeof loader>()
	return <LocationEditor title="Add Location" organs={organs} />
}
