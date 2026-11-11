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
import { sendIncidentStatusEmail } from '~/utils/incident-notifications.server'
import { changeIncidentStatus } from '~/utils/incident-status.server'
import { formatFullName, invariantResponse } from '~/utils/misc'
import { requireIncidentAdmin } from '~/utils/incident-scope.server'
import { redirectWithToast } from '~/utils/toast.server'

const EscalateSchema = z.object({
	officerId: z.string({ required_error: 'Select an officer' }),
	reason: z
		.string({ required_error: 'Give a reason for the escalation' })
		.trim()
		.min(1, 'Give a reason for the escalation')
		.max(2000),
	isVisibleToReporter: z.boolean().default(false),
})

const closedStatuses = ['RESOLVED', 'CLOSED'] as const

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { scopeWhere } = await requireIncidentAdmin(request)

	const incident = await prisma.incident.findFirst({
		where: { id: params.incidentId, ...scopeWhere },
		select: { id: true, status: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	const officers = await prisma.officer.findMany({
		where: { type: 'INCIDENT' },
		select: {
			id: true,
			employee: {
				select: { firstName: true, middleName: true, familyName: true },
			},
		},
		orderBy: { employee: { firstName: 'asc' } },
	})

	return json({ incident, officers })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { user, scopeWhere } = await requireIncidentAdmin(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const incident = await prisma.incident.findFirst({
		where: { id: params.incidentId, ...scopeWhere },
		select: { id: true, status: true, incidentNumber: true },
	})
	invariantResponse(incident, 'Incident not found', { status: 404 })

	const submission = await parseWithZod(formData, {
		schema: EscalateSchema.superRefine(async (data, ctx) => {
			if ((closedStatuses as readonly string[]).includes(incident.status)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['reason'],
					message:
						'This incident is resolved or closed. Change its status first to reopen it.',
				})
			}
			const officer = await prisma.officer.findFirst({
				where: { id: data.officerId, type: 'INCIDENT' },
				select: { id: true },
			})
			if (!officer) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['officerId'],
					message: 'Officer not found',
				})
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

	const { officerId, reason, isVisibleToReporter } = submission.value

	const history = await prisma.$transaction(async tx => {
		const assignment = await tx.incidentAssignment.create({
			data: {
				incidentId: incident.id,
				officerId,
				remarks: `Escalated: ${reason}`,
			},
			select: { id: true },
		})
		await tx.auditLog.create({
			data: {
				userId: user.id,
				action: 'CREATE',
				entity: 'IncidentAssignment',
				details: {
					incidentId: incident.id,
					incidentNumber: incident.incidentNumber,
					assignmentId: assignment.id,
					officerId,
					escalation: true,
				},
			},
		})
		const { history } = await changeIncidentStatus(
			{
				incidentId: incident.id,
				toStatus: 'ESCALATED',
				userId: user.id,
				remarks: reason,
				isVisibleToReporter,
			},
			tx,
		)
		return history
	})
	void sendIncidentStatusEmail(history.id, request)

	return redirectWithToast(`/dashboard/incidents/${incident.id}`, {
		type: 'success',
		title: 'Incident Escalated',
		description: 'The officer has been assigned and the incident escalated.',
	})
}

export default function EscalateIncident() {
	const { incident, officers } = useLoaderData<typeof loader>()
	const params = useParams()
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'incident-escalate-form',
		constraint: getZodConstraint(EscalateSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EscalateSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<CardTitle className="text-base font-semibold leading-6 text-gray-900">
					Escalate Incident
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
								label: 'Escalate to',
								field: fields.officerId,
								errors: fields.officerId.errors,
								type: 'select',
								data: officers.map(officer => ({
									name: formatFullName(officer.employee),
									value: officer.id,
								})),
							}}
						/>
						<FormField
							item={{
								label: 'Reason visible to reporter',
								field: fields.isVisibleToReporter,
								errors: fields.isVisibleToReporter.errors,
								type: 'checkbox',
							}}
						/>
						<div className="md:col-span-2">
							<FormField
								item={{
									label: 'Reason',
									field: fields.reason,
									errors: fields.reason.errors,
									type: 'textarea',
								}}
							/>
						</div>
					</div>
					<div className="flex gap-2 w-full">
						<Button type="submit" variant="destructive" className="flex-grow">
							Escalate
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
