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
	useNavigate,
	useParams,
	useSearchParams,
} from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Field, FieldError } from '~/components/Field'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

export const AssignmentSchema = z.object({
	id: z.string().optional(),
	incidentNumber: z.string().optional(),
	officerId: z.string(),
	remarks: z.string().optional(),
})

export const AssignmentDeleteSchema = z.object({
	id: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	const intent = formData.get('intent')

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
		where: { incidentNumber },
		select: { id: true },
	})

	invariantResponse(incident, 'Incident not found', {
		status: 404,
	})

	const data = {
		...assignment,
		incidentId: incident.id,
	}
	await prisma.incidentAssignment.upsert({
		select: { id: true },
		where: { id: assignmentId ?? '__new_assignment__' },
		create: {
			...data,
		},
		update: {
			...data,
		},
	})

	return redirectWithToast(`/dashboard/incidents/${incident.id}`, {
		type: 'success',
		title: `Assignment ${assignmentId ? 'Updated' : 'Created'}`,
		description: `Assignment ${
			assignmentId ? 'updated' : 'created'
		} successfully.`,
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])

	const { incidentId } = params

	const incident = await prisma.incident.findUnique({
		where: {
			id: incidentId,
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
	const navigate = useNavigate()

	const params = useParams()
	const [searchParams] = useSearchParams()
	const actionData = useActionData<typeof action>()
	const intent = searchParams.get('intent')
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? AssignmentDeleteSchema : AssignmentSchema
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

	const handleClose = () => {
		navigate(-1)
	}

	return (
		<div className="grid gap-4 py-4">
			<div className="flex flex-col gap-8">
				<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<InputField meta={fields.id} type="hidden" />

					<Field>
						<Label htmlFor={fields.incidentNumber.id}>Incident Number</Label>
						<InputField
							meta={fields.incidentNumber}
							type="text"
							autoComplete="off"
							readOnly
						/>
					</Field>

					<Field>
						<Label htmlFor={fields.officerId.id}>Officer</Label>
						<SelectField
							meta={fields.officerId}
							items={officers.map(officer => ({
								name: `${officer.employee.firstName} ${officer.employee.middleName}`,
								value: officer.id,
							}))}
							placeholder="Select an officer"
						/>
						{fields.officerId.errors && (
							<FieldError>{fields.officerId.errors}</FieldError>
						)}
					</Field>

					<Field>
						<Label htmlFor={fields.remarks.id}>Remarks</Label>
						<InputField
							meta={fields.remarks}
							type="text"
							autoComplete="off"
							disabled={disabled}
						/>
						{fields.remarks.errors && (
							<FieldError>{fields.remarks.errors}</FieldError>
						)}
					</Field>
				</Form>
				<div className="flex items-center justify-end space-x-2">
					<Button
						type="submit"
						form={form.id}
						name="intent"
						value={intent ?? 'add'}
						variant={intent === 'delete' ? 'destructive' : 'default'}
					>
						{intent === 'delete' ? 'Delete' : 'Save'}
					</Button>
					<Button asChild variant="outline">
						<Link to={`/dashboard/incidents/${params.incidentId}`}>Cancel</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
