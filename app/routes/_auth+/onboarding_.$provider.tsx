import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	redirect,
	useLoaderData,
	useNavigation,
	type Params,
} from '@remix-run/react'
import { z } from 'zod'
import {
	authenticator,
	getSessionExpirationDate,
	requireAnonymous,
} from '~/utils/auth.server'
import { ProviderNameSchema } from '~/utils/connections'
import { prisma } from '~/utils/db.server'
import { NameSchema, UsernameSchema } from '~/utils/validation'
import { verifySessionStorage } from '~/utils/verification.server'

import { getFormProps, useForm } from '@conform-to/react'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { ErrorList } from '~/components/ErrorList'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
import { InputField } from '~/components/conform/InputField'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { sessionStorage } from '~/utils/session.server'

export const onboardingEmailSessionKey = 'onboardingEmail'
export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'

const SignupFormSchema = z.object({
	username: UsernameSchema,
	name: NameSchema,
	agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
		required_error: 'You must agree to the terms of service and privacy policy',
	}),
	remember: z.boolean().optional(),
	redirectTo: z.string().optional(),
})

async function requireData({
	request,
	params,
}: {
	request: Request
	params: Params
}) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	const providerId = verifySession.get(providerIdKey)
	const result = z
		.object({
			email: z.string(),
			providerName: ProviderNameSchema,
			providerId: z.string(),
		})
		.safeParse({ email, providerName: params.provider, providerId })
	if (result.success) {
		return result.data
	} else {
		console.error(result.error)
		throw redirect('/signup')
	}
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { email } = await requireData({ request, params })
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const prefilledProfile: {
		username?: string
		name?: string
		agreeToTermsOfServiceAndPrivacyPolicy?: boolean
		remember?: boolean
	} = verifySession.get(prefilledProfileKey)

	const formError = cookieSession.get(authenticator.sessionErrorKey)

	return json({
		email,
		status: 'idle',
		submission: {
			intent: '',
			payload: prefilledProfile ?? {},
			error: {
				'': typeof formError === 'string' ? [formError] : [],
			},
		},
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { email, providerId, providerName } = await requireData({
		request,
		params,
	})
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: SignupFormSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { username: data.username },
				select: { id: true },
			})
			if (existingUser) {
				ctx.addIssue({
					path: ['username'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this username',
				})
				return
			}
		}).transform(async data => {
			const user = await prisma.user.create({
				select: { id: true },
				data: {
					email: email.toLowerCase(),
					username: data.username.toLowerCase(),
					name: data.name,
					roles: {
						connect: { name: 'user' },
					},
					connections: { create: { providerId, providerName } },
				},
			})
			return { ...data, user }
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { user, remember, redirectTo } = submission.value

	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)

	cookieSession.set('userId', user.id)
	return redirect('/', {
		headers: {
			'set-cookie': await sessionStorage.commitSession(cookieSession, {
				expires: remember ? getSessionExpirationDate() : undefined,
			}),
		},
	})
}

export default function SignupRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(SignupFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
		defaultValue: navigation.state == 'idle' ? data.submission.payload : null,
	})

	return (
		<Card className="mx-auto max-w-sm">
			<CardHeader>
				<CardTitle className="text-xl">Sign Up</CardTitle>
				<CardDescription>
					Enter your information to create an account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<div className="grid gap-4">
						<Field>
							<Label htmlFor={fields.username.id}>Username</Label>
							<InputField meta={fields.username} type="text" />
							{fields.username.errors && (
								<FieldError>{fields.username.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.name.id}>Name</Label>
							<InputField meta={fields.name} type="text" />
							{fields.name.errors && (
								<FieldError>{fields.name.errors}</FieldError>
							)}
						</Field>

						<Field>
							<div className="flex items-center gap-2">
								<CheckboxField
									meta={fields.agreeToTermsOfServiceAndPrivacyPolicy}
								/>
								<Label
									htmlFor={fields.agreeToTermsOfServiceAndPrivacyPolicy.id}
								>
									Agree to our Terms of Service?
								</Label>
							</div>
							{fields.agreeToTermsOfServiceAndPrivacyPolicy.errors && (
								<FieldError>
									{fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
								</FieldError>
							)}
						</Field>

						<Field>
							<div className="flex items-center gap-2">
								<CheckboxField meta={fields.remember} />
								<Label htmlFor={fields.remember.id}>Remember me</Label>
							</div>
							{fields.remember.errors && (
								<FieldError>{fields.remember.errors}</FieldError>
							)}
						</Field>

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Create an account
						</Button>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}
