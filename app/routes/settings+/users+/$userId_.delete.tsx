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
	})

	invariantResponse(user, 'Not Found', { status: 404 })

	return json({ user })
}

export default function EditCountryRoute() {
	const { user } = useLoaderData<typeof loader>()
	return <UserEditor user={user} title="Delete User" intent="delete" />
}
