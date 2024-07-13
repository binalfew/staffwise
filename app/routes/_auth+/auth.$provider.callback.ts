import { LoaderFunctionArgs, redirect } from '@remix-run/node'
import { authenticator, getUserId } from '~/utils/auth.server'
import { providerLabels, ProviderNameSchema } from '~/utils/connections'
import { prisma } from '~/utils/db.server'
import { handleNewSession } from '~/utils/session.server'
import { createToastHeaders, redirectWithToast } from '~/utils/toast.server'

import { verifySessionStorage } from '~/utils/verification.server'
import {
	onboardingEmailSessionKey,
	prefilledProfileKey,
	providerIdKey,
} from './onboarding.$provider'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)
	const label = providerLabels[providerName]

	const profile = await authenticator
		.authenticate(providerName, request, {
			throwOnError: true,
		})
		.catch(async error => {
			console.error(error)

			throw await redirectWithToast('/login', {
				type: 'error',
				title: 'Auth Failed',
				description: `There was an error authenticating with ${label}. Please try again.`,
			})
		})

	const existingConnection = await prisma.connection.findUnique({
		select: {
			userId: true,
		},
		where: {
			providerName_providerId: {
				providerName,
				providerId: profile.id,
			},
		},
	})

	const userId = await getUserId(request)

	if (existingConnection && userId) {
		throw await redirectWithToast('/', {
			title: 'Already Connected',
			description:
				existingConnection.userId === userId
					? `Your "${profile.username} ${label}" account is already connected.`
					: `Your "${profile.username} ${label}" account is already connected to another account.`,
			type: 'success',
		})
	}

	if (userId) {
		await prisma.connection.create({
			data: {
				providerName,
				providerId: profile.id,
				userId,
			},
		})

		throw await redirectWithToast('/', {
			title: 'Connected',
			description: `Your "${profile.username} ${label}" account has been connected.`,
			type: 'success',
		})
	}

	if (existingConnection) {
		return makeSession({ request, userId: existingConnection.userId })
	}

	const user = await prisma.user.findUnique({
		select: {
			id: true,
		},
		where: {
			email: profile.email.toLowerCase(),
		},
	})

	if (user) {
		await prisma.connection.create({
			data: {
				providerName,
				providerId: profile.id,
				userId: user.id,
			},
		})

		return makeSession(
			{ request, userId: user.id },
			{
				headers: await createToastHeaders({
					type: 'success',
					title: 'Connected',
					description: `Your "${profile.username} ${label}" account has been connected.`,
				}),
			},
		)
	}

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(onboardingEmailSessionKey, profile.email)
	verifySession.set(prefilledProfileKey, {
		...profile,
		username: profile.username
			?.replace(/[^a-zA-Z0-9]/gi, '_')
			.toLowerCase()
			.slice(0, 20)
			.padEnd(3, '_'),
	})
	verifySession.set(providerIdKey, profile.id)

	return redirect(`/onboarding/${providerName}`, {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})

	// throw await redirectWithToast('/login', {
	// 	title: 'Auth Success (jk)',
	// 	description: `You have successfully authenticated with ${label} (not really though...).`,
	// 	type: 'success',
	// })
}

async function makeSession(
	{
		request,
		userId,
		redirectTo,
	}: {
		request: Request
		userId: string
		redirectTo?: string | null
	},
	responseInit?: ResponseInit,
) {
	redirectTo ??= '/'

	return handleNewSession(
		{
			request,
			user: { id: userId! },
			remember: true,
			redirectTo,
		},
		responseInit,
	)
}
