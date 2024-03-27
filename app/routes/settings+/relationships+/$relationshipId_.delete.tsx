import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { RelationshipEditor } from './__relationship-editor'
export { action } from './__relationship-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { relationshipId } = params

	const relationship = await prisma.relationship.findUnique({
		where: { id: relationshipId },
	})

	invariantResponse(relationship, 'Not Found', { status: 404 })

	return json({ relationship })
}

export default function DeleteRelationshipRoute() {
	const { relationship } = useLoaderData<typeof loader>()
	return (
		<RelationshipEditor
			relationship={relationship}
			title="Delete Relationship"
			intent="delete"
		/>
	)
}
