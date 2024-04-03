import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { DependantEditor } from './__dependant-editor'
export { action } from './__dependant-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const relationships = await prisma.relationship.findMany({
		select: { id: true, name: true },
	})

	return json({ relationships })
}

export default function DeleteDependantRoute() {
	const { relationships } = useLoaderData<typeof loader>()
	return <DependantEditor relationships={relationships} title="Add Dependant" />
}
