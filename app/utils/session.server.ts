import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { getSessionExpirationDate } from './auth.server'
import { combineResponses } from './misc'

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		secrets: process.env.SESSION_SECRET.split(','),
	},
})

export async function handleNewSession(
	{
		request,
		user,
		remember = false,
		redirectTo,
	}: {
		request: Request
		user: { id: string }
		remember?: boolean
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	cookieSession.set('userId', user.id)

	return redirect(
		safeRedirect(redirectTo),
		combineResponses(
			{
				headers: {
					'set-cookie': await sessionStorage.commitSession(cookieSession, {
						expires: remember ? getSessionExpirationDate() : undefined,
					}),
				},
			},
			responseInit,
		),
	)
}
