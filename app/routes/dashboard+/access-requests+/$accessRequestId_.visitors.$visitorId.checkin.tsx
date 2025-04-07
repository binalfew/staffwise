import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
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

import { FieldError } from '~/components/Field'
import FormField from '~/components/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

export const VisitorCheckinSchema = z.object({
	id: z.string(),
	badgeNumber: z.string({ required_error: 'Badge number is required' }),
})

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { visitorId, accessRequestId } = params
	invariantResponse(visitorId, 'Visitor ID not found', { status: 404 })
	invariantResponse(accessRequestId, 'Access Request ID not found', {
		status: 404,
	})

	const accessRequest = await prisma.accessRequest.findUnique({
		where: { id: accessRequestId },
		select: { startDate: true, endDate: true },
	})

	invariantResponse(accessRequest, 'Access Request not found', { status: 404 })

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const startDate = new Date(accessRequest.startDate)
	startDate.setHours(0, 0, 0, 0)
	const endDate = new Date(accessRequest.endDate)
	endDate.setHours(23, 59, 59, 999)

	// Compare dates with end date set to end of day
	const isWithinDateRange = today >= startDate && today <= endDate

	invariantResponse(
		isWithinDateRange,
		`Check-in is only allowed from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
		{ status: 403 },
	)

	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = await parseWithZod(formData, {
		schema: VisitorCheckinSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const visitor = await prisma.visitor.findFirst({
		where: { id: visitorId },
		select: { id: true },
	})

	invariantResponse(visitor, 'Visitor not found', {
		status: 404,
	})

	await prisma.visitorLog.create({
		data: {
			visitorId,
			checkIn: new Date(),
			badgeNumber: submission.value.badgeNumber,
		},
	})

	return redirectWithToast(`/dashboard/access-requests/${accessRequestId}`, {
		type: 'success',
		title: 'Visitor Checked In',
		description: 'Visitor checked in successfully.',
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { visitorId, accessRequestId } = params
	invariantResponse(visitorId, 'Visitor ID not found', { status: 404 })
	invariantResponse(accessRequestId, 'Access Request ID not found', {
		status: 404,
	})

	const accessRequest = await prisma.accessRequest.findUnique({
		where: { id: accessRequestId },
		select: { startDate: true, endDate: true },
	})

	invariantResponse(accessRequest, 'Access Request not found', { status: 404 })

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const startDate = new Date(accessRequest.startDate)
	startDate.setHours(0, 0, 0, 0)
	const endDate = new Date(accessRequest.endDate)
	endDate.setHours(23, 59, 59, 999)

	// Compare dates with end date set to end of day
	const isWithinDateRange = today >= startDate && today <= endDate

	invariantResponse(
		isWithinDateRange,
		`Check-in is only allowed from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
		{ status: 400 },
	)

	const visitor = await prisma.visitor.findUnique({
		where: { id: visitorId },
		select: { id: true },
	})

	invariantResponse(visitor, 'Visitor not found', { status: 404 })

	return json({ visitor })
}

export default function VisitorCheckin() {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'visitor-checkin-form',
		constraint: getZodConstraint(VisitorCheckinSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VisitorCheckinSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			id: params.visitorId,
		},
	})

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			type: 'text' as const,
			field: fields.badgeNumber,
			label: 'Badge Number',
			placeholder: 'Enter badge number',
		},
	]

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Check In Visitor
					</CardTitle>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-4">
				<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<div className="">
						{formItems.map((item, index) => (
							<div key={index} className="w-full space-y-2">
								<FormField item={item} />
								{item.field.errors && (
									<FieldError>{item.field.errors}</FieldError>
								)}
							</div>
						))}
					</div>

					<div className="flex gap-2 w-full">
						<Button type="submit" className="flex-grow">
							Check In
						</Button>

						<Button asChild variant="outline" className="flex-grow">
							<Link to={`/dashboard/access-requests/${params.accessRequestId}`}>
								Cancel
							</Link>
						</Button>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}
