import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { LocationEditor } from './__location-editor'
export { action } from './__location-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { locationId } = params

	const location = await prisma.location.findUnique({
		where: { id: locationId },
	})

	invariantResponse(location, 'Not Found', { status: 404 })

	return json({ location })
}

export default function DeleteLocationRoute() {
	const { location } = useLoaderData<typeof loader>()
	return (
		<LocationEditor
			location={location}
			title="Delete Location"
			intent="delete"
		/>
	)
}
