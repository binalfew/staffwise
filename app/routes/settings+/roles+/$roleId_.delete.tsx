import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { RoleEditor } from './__role-editor'
export { action } from './__role-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { roleId } = params

	const role = await prisma.role.findUnique({
		where: { id: roleId },
	})

	invariantResponse(role, 'Not Found', { status: 404 })

	const permissions = await prisma.permission.findMany()

	return json({ role, permissions })
}

export default function DeleteRoleRoute() {
	const { role, permissions } = useLoaderData<typeof loader>()
	return (
		<RoleEditor
			role={role}
			permissions={permissions}
			title="Delete Role"
			intent="delete"
		/>
	)
}
