import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { insertAuditLog } from '~/utils/audit.server'
import { requireUser } from '~/utils/auth.server'
import { sessionStorage } from '~/utils/session.server'

export async function loader() {
	return redirect('/')
}

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	await insertAuditLog({
		user,
		action: 'LOGOUT',
		entity: 'User',
		request: request,
	})

	const cookieSession = await sessionStorage.getSession()
	return redirect('/', {
		headers: {
			'set-cookie': await sessionStorage.destroySession(cookieSession),
		},
	})
}
