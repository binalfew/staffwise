import { LoaderFunctionArgs, redirect } from '@remix-run/node'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { userHasRole } from '~/utils/user'

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

	const isAdmin = userHasRole(user, 'admin')

	if (isAdmin) {
		throw redirect('/dashboard')
	} else {
		throw redirect('/profile')
	}
}

export default function Index() {
	return <div></div>
}
