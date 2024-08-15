import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { PermissionEditor } from './__permission-editor'
export { action } from './__permission-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { permissionId } = params

	const permission = await prisma.permission.findUnique({
		where: { id: permissionId },
	})

	invariantResponse(permission, 'Not Found', { status: 404 })

	return json({ permission })
}

export default function EditCountryRoute() {
	const { permission } = useLoaderData<typeof loader>()
	return (
		<PermissionEditor
			permission={permission}
			title="Delete Permission"
			intent="delete"
		/>
	)
}
