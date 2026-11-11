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
import FormField from '~/components/FormField'
import { IncidentStatusBadge } from '~/components/IncidentStatusBadge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { incidentStatusLabels, incidentStatuses } from '~/utils/incident-status'
import { changeIncidentStatus } from '~/utils/incident-status.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

// Escalation needs an officer, so it goes through the escalate route instead.
const selectableStatuses = incidentStatuses.filter(
	status => status !== 'ESCALATED',
)

const StatusSchema = z.object({
	status: z.enum(incidentStatuses).refine(s => s !== 'ESCALATED', {
		message: 'Use Escalate to escalate an incident',
	}),
	remarks: z.string().trim().max(2000).optional(),
	isVisibleToReporter: z.boolean().default(false),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])

	const incident = await prisma.incident.findUnique({
		where: { id: params.incidentId },
		select: { id: true, status: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	return json({ incident })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const user = await requireUserWithRoles(request, ['admin', 'incidentAdmin'])
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const incident = await prisma.incident.findUnique({
		where: { id: params.incidentId },
		select: { id: true, status: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	const submission = parseWithZod(formData, {
		schema: StatusSchema.superRefine((data, ctx) => {
			if (data.status === incident.status) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['status'],
					message: 'The incident already has this status',
				})
			}
		}),
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { status, remarks, isVisibleToReporter } = submission.value

	await changeIncidentStatus({
		incidentId: incident.id,
		toStatus: status,
		userId: user.id,
		remarks,
		isVisibleToReporter,
	})

	return redirectWithToast(`/dashboard/incidents/${incident.id}`, {
		type: 'success',
		title: 'Status Updated',
		description: `Incident status changed to ${incidentStatusLabels[status]}.`,
	})
}

export default function IncidentStatusEditor() {
	const { incident } = useLoaderData<typeof loader>()
	const params = useParams()
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'incident-status-form',
		constraint: getZodConstraint(StatusSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: StatusSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: { isVisibleToReporter: 'on' },
	})

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<CardTitle className="text-base font-semibold leading-6 text-gray-900">
					Change Status
				</CardTitle>
				<div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
					Current: <IncidentStatusBadge status={incident.status} />
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">
				<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							item={{
								label: 'New Status',
								field: fields.status,
								errors: fields.status.errors,
								type: 'select',
								data: selectableStatuses
									.filter(status => status !== incident.status)
									.map(status => ({
										name: incidentStatusLabels[status],
										value: status,
									})),
							}}
						/>
						<FormField
							item={{
								label: 'Visible to reporter',
								field: fields.isVisibleToReporter,
								errors: fields.isVisibleToReporter.errors,
								type: 'checkbox',
							}}
						/>
						<div className="md:col-span-2">
							<FormField
								item={{
									label: 'Remarks',
									field: fields.remarks,
									errors: fields.remarks.errors,
									type: 'textarea',
								}}
							/>
						</div>
					</div>
					<p className="text-xs text-muted-foreground">
						Untick &ldquo;Visible to reporter&rdquo; to keep the remarks as an
						internal note. The reporter still sees the new status.
					</p>
					<div className="flex gap-2 w-full">
						<Button type="submit" className="flex-grow">
							Save
						</Button>
						<Button asChild variant="outline" className="flex-grow">
							<Link to={`/dashboard/incidents/${params.incidentId}`}>
								Cancel
							</Link>
						</Button>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}
