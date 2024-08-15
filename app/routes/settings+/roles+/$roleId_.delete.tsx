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

	return json({ role })
}

export default function EditCountryRoute() {
	const { role } = useLoaderData<typeof loader>()
	return <RoleEditor role={role} title="Delete Role" intent="delete" />
}
