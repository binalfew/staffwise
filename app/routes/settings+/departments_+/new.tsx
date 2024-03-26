import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { DepartmentEditor } from './__department-editor'
export { action } from './__department-editor.server'

export async function loader() {
	// Fetch all organs for the selection in the department editor
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	return json({ organs })
}

export default function AddDepartmentRoute() {
	const { organs } = useLoaderData<typeof loader>()
	return <DepartmentEditor title="Add Department" organs={organs} />
}
