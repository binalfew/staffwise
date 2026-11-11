import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { UserEditor } from './__user-editor'
export { action } from './__user-editor.server'

export async function loader() {
	const roles = await prisma.role.findMany()
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	return json({ roles, organs })
}

export default function AddRoleRoute() {
	const { roles, organs } = useLoaderData<typeof loader>()

	return <UserEditor title="Add User" roles={roles} organs={organs} />
}
