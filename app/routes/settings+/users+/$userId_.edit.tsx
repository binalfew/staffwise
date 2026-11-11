import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { UserEditor } from './__user-editor'
export { action } from './__user-editor.server'

export async function loader({ params }: LoaderFunctionArgs) {
	const { userId } = params

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { roles: true, adminOrgans: { select: { organId: true } } },
	})

	invariantResponse(user, 'Not Found', { status: 404 })

	const roles = await prisma.role.findMany()
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	return json({ user, roles, organs })
}

export default function EditCountryRoute() {
	const { user, roles, organs } = useLoaderData<typeof loader>()

	return (
		<UserEditor user={user} roles={roles} organs={organs} title="Edit User" />
	)
}
