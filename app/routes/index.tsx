import { LoaderFunctionArgs, redirect } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { userHasRoles } from '~/utils/user'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		select: {
			id: true,
			name: true,
			username: true,
			roles: {
				select: {
					name: true,
					permissions: {
						select: {
							action: true,
							entity: true,
							access: true,
						},
					},
				},
			},
		},
		where: { id: userId },
	})

	const isAdmin = userHasRoles(user, [
		'admin',
		'phpAdmin',
		'accessRequestAdmin',
	])

	if (isAdmin) {
		throw redirect('/dashboard')
	} else {
		throw redirect(`/profile/${user?.id}`)
	}
}

export default function Index() {
	return <div></div>
}
