import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { RoleEditor } from './__role-editor'
export { action } from './__role-editor.server'

export async function loader() {
	const permissions = await prisma.permission.findMany()

	return json({ permissions })
}

export default function AddRoleRoute() {
	const { permissions } = useLoaderData<typeof loader>()
	return <RoleEditor permissions={permissions} title="Add Role" />
}
