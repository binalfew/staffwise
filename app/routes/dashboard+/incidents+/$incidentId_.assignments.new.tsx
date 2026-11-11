import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { IncidentAssignment } from '@prisma/client'
import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	SerializeFrom,
} from '@remix-run/node'
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
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { FieldError } from '~/components/Field'
import { Button } from '~/components/ui/button'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { sendIncidentStatusEmail } from '~/utils/incident-notifications.server'
import { changeIncidentStatus } from '~/utils/incident-status.server'
import { formatFullName, invariantResponse } from '~/utils/misc'
import { requireIncidentAdmin } from '~/utils/incident-scope.server'
import { redirectWithToast } from '~/utils/toast.server'

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

export const AssignmentSchema = z.object({
	id: z.string().optional(),
	incidentNumber: z.string().optional(),
	officerId: z.string(),
	remarks: z.string().optional(),
})

export async function action({ request }: ActionFunctionArgs) {
	const { user, scopeWhere } = await requireIncidentAdmin(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = await parseWithZod(formData, {
		schema: AssignmentSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: assignmentId, incidentNumber, ...assignment } = submission.value

	const incident = await prisma.incident.findFirst({
		where: { incidentNumber, ...scopeWhere },
		select: { id: true, status: true },
	})

	invariantResponse(incident, 'Incident not found', {
		status: 404,
	})

	const data = {
		...assignment,
		incidentId: incident.id,
	}
	const statusHistoryId = await prisma.$transaction(async tx => {
		const saved = await tx.incidentAssignment.upsert({
			select: { id: true },
			// An existing assignment must belong to this incident.
			where: {
				id: assignmentId ?? '__new_assignment__',
				incidentId: incident.id,
			},
			create: data,
			update: data,
		})
		await tx.auditLog.create({
			data: {
				userId: user.id,
				action: assignmentId ? 'UPDATE' : 'CREATE',
				entity: 'IncidentAssignment',
				details: {
					incidentId: incident.id,
					incidentNumber,
					assignmentId: saved.id,
					officerId: assignment.officerId,
				},
			},
		})
		// The first officer assigned means someone is looking at the incident.
		if (!assignmentId && incident.status === 'SUBMITTED') {
			const { history } = await changeIncidentStatus(
				{
					incidentId: incident.id,
					toStatus: 'UNDER_REVIEW',
					userId: user.id,
					remarks: 'An officer has been assigned to your report.',
					isVisibleToReporter: true,
				},
				tx,
			)
			return history.id
		}
		return null
	})
	if (statusHistoryId) void sendIncidentStatusEmail(statusHistoryId, request)

	return redirectWithToast(`/dashboard/incidents/${incident.id}`, {
		type: 'success',
		title: 'Officer Assigned',
		description: `Officer successfully assigned to incident.`,
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { scopeWhere } = await requireIncidentAdmin(request)

	const { incidentId } = params

	const incident = await prisma.incident.findFirst({
		where: {
			id: incidentId,
			...scopeWhere,
		},
	})

	invariantResponse(incident, 'Incident not found', { status: 404 })

	const officers = await prisma.officer.findMany({
		where: {
			type: 'INCIDENT',
		},
		select: {
			id: true,
			employee: {
				select: {
					firstName: true,
					middleName: true,
					familyName: true,
				},
			},
		},
	})

	return json({ incident, officers })
}

export default function AssignmentEditor({
	assignment,
}: {
	assignment?: SerializeFrom<
		Pick<IncidentAssignment, 'id' | 'officerId' | 'remarks'>
	>
}) {
	const { incident, officers } = useLoaderData<typeof loader>()

	const params = useParams()
	const actionData = useActionData<typeof action>()
	const schema = AssignmentSchema
	const [form, fields] = useForm({
		id: 'assignment-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...assignment,
			incidentNumber: incident.incidentNumber,
		},
	})
	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Assign Officer
					</CardTitle>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">
				<div className="py-4">
					<Form
						className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
						method="POST"
						{...getFormProps(form)}
					>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />

						<div className="w-full sm:flex-grow">
							<SelectField
								meta={fields.officerId}
								items={officers.map(officer => ({
									name: formatFullName(officer.employee),
									value: officer.id,
								}))}
								placeholder="Select an officer"
							/>
							{fields.officerId.errors && (
								<FieldError>{fields.officerId.errors}</FieldError>
							)}
						</div>

						<div className="w-full sm:flex-grow">
							<InputField
								meta={fields.remarks}
								type="text"
								autoComplete="off"
								placeholder="Remarks"
								className="h-10 w-full"
							/>
							{fields.remarks.errors && (
								<FieldError>{fields.remarks.errors}</FieldError>
							)}
						</div>

						<div className="flex gap-2 w-full sm:w-auto">
							<Button type="submit" className="flex-grow sm:flex-grow-0">
								Assign
							</Button>

							<Button
								asChild
								variant="outline"
								className="flex-grow sm:flex-grow-0"
							>
								<Link to={`/dashboard/incidents/${params.incidentId}`}>
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
