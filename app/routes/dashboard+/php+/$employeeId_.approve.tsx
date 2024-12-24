import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

import FormField from '~/components/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { sendEmail } from '~/utils/email.server'

export const EmployeeApprovalSchema = z.object({
	id: z.string().optional(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = await parseWithZod(formData, {
		schema: EmployeeApprovalSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: employeeId } = submission.value

	const employee = await prisma.employee.findFirst({
		where: { id: employeeId },
		select: { id: true },
	})

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const updatedEmployee = await prisma.employee.update({
		where: { id: employeeId },
		select: { email: true },
		data: {
			profileStatus: 'APPROVED',
			profileRemarks: null,
		},
	})

	sendEmail({
		to: updatedEmployee.email,
		subject: 'Profile Update Approved',
		plainText:
			'Your profile update has been approved. You can now login to the system and request services.',
		html: '<html><body><h1>Your profile update has been approved. You can now login to the system and request services.</h1></body></html>',
	})

	return redirectWithToast(`/dashboard/php/${employee.id}`, {
		type: 'success',
		title: 'Employee Profile Approved',
		description: `Employee profile successfully approved.`,
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])

	const { employeeId } = params

	const employee = await prisma.employee.findUnique({
		where: {
			id: employeeId,
		},
		select: {
			id: true,
		},
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	return json({ employee })
}

export default function AssessmentEditor() {
	const { employee } = useLoaderData<typeof loader>()

	const params = useParams()
	const actionData = useActionData<typeof action>()
	const schema = EmployeeApprovalSchema
	const [form, fields] = useForm({
		id: 'employee-approval-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			id: employee.id,
		},
	})

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
	]

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Approve Profile
					</CardTitle>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8">
				<div className="py-4">
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{formItems.map((item, index) => (
								<div key={index} className="w-full">
									<FormField item={item} />
								</div>
							))}
						</div>

						<div className="flex gap-2 w-full">
							<Button type="submit" className="flex-grow">
								Approve
							</Button>

							<Button asChild variant="outline" className="flex-grow">
								<Link to={`/dashboard/php/${params.employeeId}`}>Cancel</Link>
							</Button>
						</div>
					</Form>
				</div>
			</CardContent>
		</Card>
	)
}
