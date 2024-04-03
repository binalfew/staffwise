import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { DependantEditor } from './__dependant-editor'
export { action } from './__dependant-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { dependantId } = params

	const dependant = await prisma.dependant.findUnique({
		where: { id: dependantId },
	})

	invariantResponse(dependant, 'Not Found', { status: 404 })

	const relationships = await prisma.relationship.findMany({
		select: { id: true, name: true },
	})

	return json({ dependant, relationships })
}

export default function DeleteSpouseRoute() {
	const { dependant, relationships } = useLoaderData<typeof loader>()
	return (
		<DependantEditor
			dependant={dependant}
			relationships={relationships}
			title="Delete Dependant"
			intent="delete"
		/>
	)
}
