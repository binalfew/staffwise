import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
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
import { requireAnonymous } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { sendEmail } from '~/utils/email.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { EmailSchema } from '~/utils/validation'
import { prepareVerification } from '~/utils/verification.server'

const SignupSchema = z
	.object({
		email: EmailSchema,
		redirect: z.string().optional(),
	})
	.refine(
		({ email }) => {
			const africanUnionEmailPattern = /^[a-zA-Z0-9._%+-]+@africa-union\.org$/
			return africanUnionEmailPattern.test(email)
		},
		{
			message: 'Email must be a valid African Union email',
			path: ['email'],
		},
	)

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { email: data.email },
				select: { id: true },
			})

			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this email address',
				})
				return
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

	const { email, redirect: postVerificationRedirectTo } = submission.value

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'onboarding',
		target: email,
		redirectTo: postVerificationRedirectTo,
	})

	sendEmail({
		to: email,
		subject: 'Welcome to Staffwise',
		plainText: `Here's your code: ${otp}. Or open this: ${verifyUrl.toString()}`,
		html: `Here's your code: <strong>${otp}</strong>. Or open this: <a href="${verifyUrl.toString()}">${verifyUrl.toString()}</a>`,
	})

	return redirect(redirectTo.toString())
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup Staffwise Account' }]
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(SignupSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="mx-auto max-w-md">
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

						<InputField meta={fields.redirect} type="hidden" />

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Create an account
						</Button>
					</div>
				</Form>
				<div className="mt-4 text-center text-sm space-x-1">
					<span>Already have an account?</span>
					<Link to="/login" className="underline">
						Sign in
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
