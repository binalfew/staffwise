import { parseWithZod } from '@conform-to/zod'
import { generateTOTP, verifyTOTP } from '@epic-web/totp'
import { createCookieSessionStorage, json, redirect } from '@remix-run/node'
import { z } from 'zod'
import { onboardingEmailSessionKey } from '~/routes/_auth+/onboarding'
import { resetPasswordUsernameSessionKey } from '~/routes/_auth+/reset-password'
import {
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	VerificationTypes,
	VerifyFunctionArgs,
	VerifySchema,
} from '~/routes/_auth+/verify'
import { prisma } from './db.server'
import { getDomainUrl, invariant } from './misc'

export const verifySessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'verification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string
	type: VerificationTypes
	target: string
}) {
	const verification = await prisma.verification.findUnique({
		where: {
			target_type: { target, type },
			OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
		},
		select: { algorithm: true, secret: true, period: true, charSet: true },
	})

	if (!verification) return false
	const result = verifyTOTP({
		otp: code,
		secret: verification.secret,
		algorithm: verification.algorithm,
		period: verification.period,
		charSet: verification.charSet,
	})
	if (!result) return false

	return true
}

export async function requireOnboardingEmail(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		throw redirect('/signup')
	}

	return email
}

export async function requireResetPasswordUsername(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const resetPasswordUsername = verifySession.get(
		resetPasswordUsernameSessionKey,
	)
	if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
		throw redirect('/forgot-password')
	}

	return resetPasswordUsername
}

export async function handleOnboardingVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(submission.payload, 'submission.value should be defined by now')
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(onboardingEmailSessionKey, submission.payload.target)
	return redirect('/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}

export async function handlePasswordResetVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(submission.payload, 'submission.value should be defined by now')
	const target = submission.payload.target as string
	const user = await prisma.user.findFirst({
		where: { OR: [{ email: target }, { username: target }] },
		select: { email: true, username: true },
	})

	// we don't want to say the user is not found if the email is not found
	// because that would allow an attacker to check if an email is registered
	if (!user) {
		return json(
			{
				result: submission.reply({
					fieldErrors: { [codeQueryParam]: ['Invalid Code'] },
				}),
			},
			{ status: 400 },
		)
	}

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(resetPasswordUsernameSessionKey, user.username)
	return redirect('/reset-password', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}

export async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const submission = await parseWithZod(body, {
		schema: () =>
			VerifySchema.superRefine(async (data, ctx) => {
				const codeIsValid = await isCodeValid({
					code: data[codeQueryParam],
					type: data[typeQueryParam],
					target: data[targetQueryParam],
				})
				if (!codeIsValid) {
					ctx.addIssue({
						path: [codeQueryParam],
						code: z.ZodIssueCode.custom,
						message: `Invalid code`,
					})
					return z.NEVER
				}
			}),

		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { value: submissionValue } = submission

	await prisma.verification.delete({
		where: {
			target_type: {
				target: submissionValue[targetQueryParam],
				type: submissionValue[typeQueryParam],
			},
		},
	})

	switch (submissionValue[typeQueryParam]) {
		case 'onboarding': {
			return handleOnboardingVerification({ request, body, submission })
		}
		case 'reset-password': {
			return handlePasswordResetVerification({ request, body, submission })
		}
		default:
			throw new Response('Invalid verification type', { status: 500 })
	}
}

export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	request: Request
	type: VerificationTypes
	target: string
	redirectTo?: string
}) {
	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, target)
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo)
	}
	return redirectToUrl
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
	redirectTo: postVerificationRedirectTo,
}: {
	period: number
	request: Request
	type: VerificationTypes
	target: string
	redirectTo?: string
}) {
	const verifyUrl = getRedirectToUrl({
		request,
		type,
		target,
		redirectTo: postVerificationRedirectTo,
	})
	const redirectTo = new URL(verifyUrl.toString())

	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		period,
	})

	const verificationData = {
		type,
		target,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	}
	await prisma.verification.upsert({
		where: { target_type: { target, type } },
		create: verificationData,
		update: verificationData,
	})

	// add the otp to the url we'll email the user.
	verifyUrl.searchParams.set(codeQueryParam, otp)

	return { otp, redirectTo, verifyUrl }
}
