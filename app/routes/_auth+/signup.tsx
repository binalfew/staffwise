import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	ActionFunctionArgs,
	MetaFunction,
	json,
	redirect,
} from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
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
import { bcrypt } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { sessionStorage } from '~/utils/session.server'
import {
	EmailSchema,
	NameSchema,
	PasswordSchema,
	UsernameSchema,
} from '~/utils/validation'

const SignupFormSchema = z
	.object({
		username: UsernameSchema,
		name: NameSchema,
		email: EmailSchema,
		password: PasswordSchema,
		confirmPassword: PasswordSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
			required_error: 'You must agree to the terms of service',
		}),
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: 'custom',
				message: 'The passwords must match',
			})
		}
	})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)
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
			const { username, email, name, password } = data

			const user = await prisma.user.create({
				select: { id: true },
				data: {
					email: email.toLowerCase(),
					username: username.toLowerCase(),
					name,
					password: {
						create: {
							hash: await bcrypt.hash(password, 10),
						},
					},
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

	const { user } = submission.value

	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	cookieSession.set('userId', user.id)

	return redirect('/', {
		headers: {
			'set-cookie': await sessionStorage.commitSession(cookieSession),
		},
	})
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup Epic Notes Account' }]
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(SignupFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
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
							<Label htmlFor={fields.email.id}>Email</Label>
							<InputField meta={fields.email} type="text" />
							{fields.email.errors && (
								<FieldError>{fields.email.errors}</FieldError>
							)}
						</Field>

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
							<Label htmlFor={fields.password.id}>Password</Label>
							<InputField meta={fields.password} type="password" />
							{fields.password.errors && (
								<FieldError>{fields.password.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.confirmPassword.id}>
								Confirm Password
							</Label>
							<InputField meta={fields.confirmPassword} type="password" />
							{fields.confirmPassword.errors && (
								<FieldError>{fields.confirmPassword.errors}</FieldError>
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

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Create an account
						</Button>
						<Button variant="outline" className="w-full">
							Sign up with Outlook
						</Button>
					</div>
				</Form>
				<div className="mt-4 text-center text-sm">
					Already have an account?{' '}
					<Link to="/login" className="underline">
						Sign in
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
