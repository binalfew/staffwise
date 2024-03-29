import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { ErrorList } from '~/components/ErrorList'
import { Field, FieldError } from '~/components/Field'
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
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { sessionStorage } from '~/utils/session.server'
import { PasswordSchema, UsernameSchema } from '~/utils/validation'

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: intent =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, user: null }

				const userAndPassword = await prisma.user.findUnique({
					select: { id: true, password: { select: { hash: true } } },
					where: { username: data.username },
				})

				if (!userAndPassword || !userAndPassword.password) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid username or password',
					})
					return z.NEVER
				}

				const isValid = await bcrypt.compare(
					data.password,
					userAndPassword.password.hash,
				)
				if (!isValid) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid username or password',
					})
					return z.NEVER
				}

				return { ...data, user: { id: userAndPassword.id } }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.user) {
		return json(
			{ result: submission.reply({ hideFields: ['password'] }) },
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

export default function LoginRoute() {
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="mx-auto max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Login</CardTitle>
				<CardDescription>
					Enter your email below to login to your account
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

						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="password">Password</Label>
								<Link to="#" className="ml-auto inline-block text-sm underline">
									Forgot your password?
								</Link>
							</div>
							<InputField meta={fields.password} type="password" />
							{fields.password.errors && (
								<FieldError>{fields.username.errors}</FieldError>
							)}
						</div>

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Login
						</Button>
						{/* <Button variant="outline" className="w-full">
						Login with Microsoft
					</Button>
					<Button variant="outline" className="w-full">
						Login with Google
					</Button> */}
					</div>
				</Form>

				<div className="mt-4 text-center text-sm space-x-1">
					<span>Don&apos;t have an account?</span>
					<Link to="/signup" className="underline">
						Sign up
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
