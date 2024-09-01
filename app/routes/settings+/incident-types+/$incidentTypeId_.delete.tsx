import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { IncidentTypeEditor } from './__incident-type-editor'
export { action } from './__incident-type-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { incidentTypeId } = params

	const incidentType = await prisma.incidentType.findUnique({
		where: { id: incidentTypeId },
	})

	invariantResponse(incidentType, 'Not Found', { status: 404 })

	return json({ incidentType })
}

export default function EditCountryRoute() {
	const { incidentType } = useLoaderData<typeof loader>()
	return (
		<IncidentTypeEditor
			incidentType={incidentType}
			title="Delete Incident Type"
			intent="delete"
		/>
	)
}
