import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { generateTOTP } from '@epic-web/totp'
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
import { getDomainUrl } from '~/utils/misc'
import { EmailSchema } from '~/utils/validation'
import { codeQueryParam, targetQueryParam, typeQueryParam } from './verify'

const SignupSchema = z.object({
	email: EmailSchema,
	redirect: z.string().optional(),
})

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
					message: 'A user already exists with this username',
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

	const { email } = submission.value

	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		period: 10 * 60, // valid for 10 minutes
	})
	const type = 'onboarding'
	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, email)
	const verifyUrl = new URL(redirectToUrl)
	verifyUrl.searchParams.set(codeQueryParam, otp)

	const verificationData = {
		type,
		target: email,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
	}
	await prisma.verification.upsert({
		where: { target_type: { target: email, type } },
		create: verificationData,
		update: verificationData,
	})

	sendEmail({
		to: email,
		subject: 'Welcome to Africa Union',
		plainText: `Here's your code: ${otp}. Or open this: ${verifyUrl.toString()}`,
		html: `Here's your code: <strong>${otp}</strong>. Or open this: <a href="${verifyUrl.toString()}">${verifyUrl.toString()}</a>`,
	})

	return redirect(redirectToUrl.toString())
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

						<InputField meta={fields.redirect} type="hidden" />

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Create an account
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
