import { Password, User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { Authenticator } from 'remix-auth'
import { GitHubStrategy } from 'remix-auth-github'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { MicrosoftStrategy } from '~/strategies/microsoft'
import { connectionSessionStorage } from './connections.server'
import { prisma } from './db.server'
import { combineResponses } from './misc'
import { sessionStorage } from './session.server'
import { redirectWithToast } from './toast.server'

export { bcrypt }

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30 // 30 days
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const userIdKey = 'userId'

type ProviderUser = {
	id: string
	email: string
	username: string
	name?: string
	imageUrl?: string
}

export const authenticator = new Authenticator<ProviderUser>(
	connectionSessionStorage,
)

authenticator.use(
	new MicrosoftStrategy(
		{
			clientId: process.env.AZURE_CLIENT_ID,
			clientSecret: process.env.AZURE_CLIENT_SECRET,
			tenantId: process.env.AZURE_TENANT_ID,
			redirectUri: '/auth/microsoft/callback',
			scope: 'openid profile email',
			prompt: 'login',
		},
		async ({ profile }) => {
			const email = profile.emails?.[0]?.value.trim().toLowerCase()
			if (!email) {
				throw redirectWithToast('/login', {
					type: 'error',
					title: 'No email found',
					description:
						'Please add a verified email address to your Microsoft account to login.',
				})
			}

			return {
				id: profile.id,
				email,
				username: profile.displayName,
				name: profile.name.givenName,
				imageUrl: profile.photos?.[0]?.value,
			}
		},
	),
	'microsoft',
)

authenticator.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
			callbackURL: '/auth/github/callback',
		},
		async ({ profile }) => {
			const email = profile.emails?.[0]?.value.trim().toLowerCase()
			if (!email) {
				throw redirectWithToast('/login', {
					type: 'error',
					title: 'No email found',
					description:
						'Please add a verified email address to your GitHub account to login.',
				})
			}

			return {
				id: profile.id,
				email,
				username: profile.displayName,
				name: profile.name.givenName,
				imageUrl: profile.photos?.[0]?.value,
			}
		},
	),
	'github',
)

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)

	throw redirect(
		safeRedirect(redirectTo),
		combineResponses(responseInit, {
			headers: {
				'set-cookie': await sessionStorage.destroySession(cookieSession),
			},
		}),
	)
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'username'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: { id: true, password: { select: { hash: true } } },
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return { id: userWithPassword.id }
}

export async function getUserId(request: Request) {
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const userId = cookieSession.get(userIdKey)

	if (!userId) return null

	const user = await prisma.user.findUnique({
		select: { id: true },
		where: { id: userId },
	})

	if (!user) {
		throw await logout({ request })
	}
	return user.id
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)

	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: redirectTo ?? `${requestUrl.pathname}${requestUrl.search}	`
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}

	return userId
}

export async function requireUser(request: Request) {
	const userId = await requireUserId(request)

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, username: true, email: true, name: true },
	})

	if (!user) {
		throw logout({ request })
	}

	return user
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

export async function login({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	return verifyUserPassword({ username }, password)
}

export async function signup({
	email,
	username,
	password,
	name,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)

	const user = await prisma.user.create({
		select: { id: true },
		data: {
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			name,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
			roles: {
				connect: { name: 'user' },
			},
		},
	})

	return user
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await bcrypt.hash(password, 10)

	return prisma.user.update({
		select: { id: true },
		where: { username },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}
