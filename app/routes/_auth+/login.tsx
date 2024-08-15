import { parseWithZod } from '@conform-to/zod'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { insertAuditLog } from '~/utils/audit.server'
import { login, requireAnonymous } from '~/utils/auth.server'
import { ProviderConnectionForm } from '~/utils/connections'
import { checkHoneypot } from '~/utils/honeypot.server'
import { handleNewSession } from '~/utils/session.server'
import { PasswordSchema, UsernameSchema } from '~/utils/validation'

export const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
})

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: intent =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, user: null }

				const user = await login(data)
				if (!user) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid username or password',
					})
					return z.NEVER
				}

				return { ...data, user }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.user) {
		return json(
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { user, remember, redirectTo } = submission.value

	await insertAuditLog({
		user,
		action: 'LOGIN',
		entity: 'User',
		request,
	})

	return handleNewSession({
		request,
		user,
		remember: remember ?? false,
		redirectTo,
	})
}

export default function LoginRoute() {
	return (
		<div className="flex items-center justify-center min-h-full p-4">
			<Card className="w-full max-w-lg shadow-lg">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Welcome Back
					</CardTitle>
					<CardDescription className="text-center text-gray-500">
						Sign in to your account to continue
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="bg-green-50 p-4 rounded-lg border border-green-200">
						<h3 className="flex items-center text-sm font-semibold text-green-800 mb-2">
							<InfoCircledIcon className="w-4 h-4 mr-2" />
							How to log in
						</h3>
						<ul className="text-sm list-disc list-inside space-y-1">
							<li>{`Click the "Login with Outlook" button below`}</li>
							<li>{`You'll be redirected to the Microsoft login page`}</li>
							<li>{`Enter your Outlook email and password`}</li>
							<li>{`Grant permission to access your account (if prompted)`}</li>
							<li>{`You'll be automatically returned to our application`}</li>
						</ul>
					</div>
					<ProviderConnectionForm type="Login" providerName="microsoft" />
				</CardContent>
			</Card>
		</div>
	)
}
