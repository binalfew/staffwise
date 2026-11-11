import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { requireEditableIncident } from './__incident-access.server'
import { IncidentEditor } from './__incident-editor'
export { action } from './__incident-editor.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { incident: own } = await requireEditableIncident(request, params)

	const incident = await prisma.incident.findUnique({
		where: { id: own.id },
		include: { attachments: true },
	})

	invariantResponse(incident, 'Not Found', { status: 404 })

	const incidentTypes = await prisma.incidentType.findMany({
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	})

	return json({ incident, incidentTypes })
}

export default function EditIncidentRoute() {
	const { incident, incidentTypes } = useLoaderData<typeof loader>()
	return (
		<IncidentEditor
			incident={incident}
			incidentTypes={incidentTypes}
			title="Edit Incident"
			description="Edit the incident"
			intent="edit"
		/>
	)
}
