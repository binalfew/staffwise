import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

export const VisitorCheckoutSchema = z.object({
	id: z.string(),
})

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { visitorId, accessRequestId } = params
	invariantResponse(visitorId, 'Visitor ID not found', { status: 404 })
	invariantResponse(accessRequestId, 'Access Request ID not found', {
		status: 404,
	})

	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = await parseWithZod(formData, {
		schema: VisitorCheckoutSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const activeLog = await prisma.visitorLog.findFirst({
		where: {
			visitorId,
			checkIn: {
				gte: today,
			},
			checkOut: null,
		},
	})

	if (!activeLog) {
		throw new Response('No active check-in found for today', { status: 400 })
	}

	await prisma.visitorLog.update({
		where: { id: activeLog.id },
		data: { checkOut: new Date() },
	})

	return redirectWithToast(`/dashboard/access-requests/${accessRequestId}`, {
		type: 'success',
		title: 'Visitor Checked Out',
		description: 'Visitor checked out successfully.',
	})
}

export default function VisitorCheckout() {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'visitor-checkout-form',
		constraint: getZodConstraint(VisitorCheckoutSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VisitorCheckoutSchema })
		},
		defaultValue: {
			id: params.visitorId,
		},
	})

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Check Out Visitor
					</CardTitle>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8">
				<div className="py-4">
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<input type="hidden" name="id" value={params.visitorId} />

						<div className="flex gap-2 w-full">
							<Button type="submit" className="flex-grow" variant="destructive">
								Check Out
							</Button>

							<Button asChild variant="outline" className="flex-grow">
								<Link
									to={`/dashboard/access-requests/${params.accessRequestId}`}
								>
									Cancel
								</Link>
							</Button>
						</div>
					</Form>
				</div>
			</CardContent>
		</Card>
	)
}
