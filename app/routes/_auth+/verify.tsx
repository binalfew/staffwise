import { getFormProps, useForm, type Submission } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
	json,
} from '@remix-run/node'
import { Form, useActionData, useSearchParams } from '@remix-run/react'
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
import { validateCSRF } from '~/utils/csrf.server'
import { validateRequest } from '~/utils/verification.server'

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'

const types = ['onboarding', 'reset-password'] as const
const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export type VerifyFunctionArgs = {
	request: Request
	submission: Submission<z.infer<typeof VerifySchema>>
	body: FormData | URLSearchParams
}

export async function loader({ request }: LoaderFunctionArgs) {
	const params = new URL(request.url).searchParams
	if (!params.has(codeQueryParam)) {
		// we don't want to show an error message on page load if the otp hasn't be prefilled in yet, so we'll send a response with an empty submission.
		return json({
			status: 'idle',
			submission: {
				payload: Object.fromEntries(params) as Record<string, unknown>,
				error: {} as Record<string, Array<string>>,
			},
		} as const)
	}

	return validateRequest(request, params)
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	return validateRequest(request, formData)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup Epic Notes Account' }]
}

export default function VerifyRoute() {
	const [searchParams] = useSearchParams()
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getZodConstraint(VerifySchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema })
		},
		shouldRevalidate: 'onBlur',
		defaultValue: {
			code: searchParams.get(codeQueryParam) ?? '',
			type: searchParams.get(typeQueryParam) ?? '',
			target: searchParams.get(targetQueryParam) ?? '',
			redirectTo: searchParams.get(redirectToQueryParam) ?? '',
		},
	})

	return (
		<Card className="mx-auto max-w-sm">
			<CardHeader>
				<CardTitle className="text-xl">Check your email</CardTitle>
				<CardDescription>
					We have sent you a code to verify your email address
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<div className="grid gap-4">
						<Field>
							<Label htmlFor={fields[codeQueryParam].id}>Code</Label>
							<InputField meta={fields[codeQueryParam]} type="text" />
							{fields[codeQueryParam].errors && (
								<FieldError>{fields[codeQueryParam].errors}</FieldError>
							)}
						</Field>

						<InputField meta={fields[typeQueryParam]} type="hidden" />
						<InputField meta={fields[targetQueryParam]} type="hidden" />
						<InputField meta={fields[redirectToQueryParam]} type="hidden" />

						<ErrorList errors={form.errors} id={form.errorId} />

						<Button type="submit" className="w-full">
							Submit
						</Button>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}
