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

export const AssessmentSchema = z.object({
	id: z.string().optional(),
	incidentId: z.string(),
	cause: z.string(),
	actionTaken: z.string(),
	severity: z.string(),
	impactType: z.string(),
	likelihood: z.string(),
	training: z.string(),
	changeOfProcedure: z.string(),
	physicalMeasures: z.string(),
	status: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = await parseWithZod(formData, {
		schema: AssessmentSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: assessmentId, ...assessment } = submission.value

	const incident = await prisma.incident.findFirst({
		where: { id: assessment.incidentId },
		select: { id: true },
	})

	invariantResponse(incident, 'Incident not found', {
		status: 404,
	})

	const data = {
		...assessment,
	}

	await prisma.incidentAssessment.upsert({
		select: { id: true },
		where: { id: assessmentId ?? '__new_assessment__' },
		create: {
			...data,
		},
		update: {
			...data,
		},
	})

	return redirectWithToast(`/dashboard/incidents/${incident.id}`, {
		type: 'success',
		title: 'Assessment Saved',
		description: `Assessment successfully saved.`,
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'incidentAdmin'])

	const { incidentId } = params

	const incident = await prisma.incident.findUnique({
		where: {
			id: incidentId,
		},
		include: {
			assessment: true,
		},
	})

	invariantResponse(incident, 'Incident not found', { status: 404 })

	return json({ incident })
}

export default function AssessmentEditor() {
	const { incident } = useLoaderData<typeof loader>()

	const params = useParams()
	const actionData = useActionData<typeof action>()
	const schema = AssessmentSchema
	const [form, fields] = useForm({
		id: 'assessment-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...incident.assessment,
			incidentId: incident.id,
		},
	})

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			type: 'hidden' as const,
			field: fields.incidentId,
		},
		{
			label: 'Cause',
			field: fields.cause,
			errors: fields.cause.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Action Taken',
			field: fields.actionTaken,
			errors: fields.actionTaken.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Severity',
			field: fields.severity,
			errors: fields.severity.errors,
			type: 'select' as const,
			data: ['Low', 'Medium', 'High', 'Critical'].map(severity => ({
				name: severity,
				value: severity,
			})),
		},
		{
			label: 'Impact Type',
			field: fields.impactType,
			errors: fields.impactType.errors,
			type: 'select' as const,
			data: ['Direct', 'Indirect', 'Systemic'].map(impactType => ({
				name: impactType,
				value: impactType,
			})),
		},
		{
			label: 'Likelihood',
			field: fields.likelihood,
			errors: fields.likelihood.errors,
			type: 'select' as const,
			data: ['Low', 'Medium', 'High', 'Critical'].map(likelihood => ({
				name: likelihood,
				value: likelihood,
			})),
		},
		{
			label: 'Training',
			field: fields.training,
			errors: fields.training.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Change of Procedure',
			field: fields.changeOfProcedure,
			errors: fields.changeOfProcedure.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Physical Measures',
			field: fields.physicalMeasures,
			errors: fields.physicalMeasures.errors,
			type: 'textarea' as const,
		},
		{
			label: 'Status',
			field: fields.status,
			errors: fields.status.errors,
			type: 'select' as const,
			data: ['Open', 'Closed'].map(status => ({
				name: status,
				value: status,
			})),
		},
	]

	return (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						Assessment
					</CardTitle>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">
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
								Save
							</Button>

							<Button asChild variant="outline" className="flex-grow">
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