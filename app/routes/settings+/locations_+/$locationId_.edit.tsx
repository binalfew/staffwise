import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { LocationEditor } from './__location-editor'
export { action } from './__location-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { locationId } = params

	// Fetch the location to be edited
	const location = await prisma.location.findUnique({
		where: { id: locationId },
	})

	// Fetch all organs for the selection dropdown
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	invariantResponse(location, 'Not Found', { status: 404 })

	return json({ location, organs })
}

export default function EditLocationRoute() {
	const { location, organs } = useLoaderData<typeof loader>()
	return (
		<LocationEditor location={location} organs={organs} title="Edit Location" />
	)
}
