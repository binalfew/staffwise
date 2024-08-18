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
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { FieldError } from '~/components/Field'
import { Button } from '~/components/ui/button'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

import { TextareaField } from '~/components/conform/TextareaField'
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
	console.log(fields.incidentId.initialValue)
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
						<InputField meta={fields.id} type="hidden" />
						<InputField meta={fields.incidentId} type="hidden" />

						<div className="w-full">
							<TextareaField
								meta={fields.cause}
								autoComplete="off"
								placeholder="Cause"
								className="h-10 w-full"
							/>
							{fields.cause.errors && (
								<FieldError>{fields.cause.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<TextareaField
								meta={fields.actionTaken}
								autoComplete="off"
								placeholder="Action Taken"
								className="h-10 w-full"
							/>
							{fields.actionTaken.errors && (
								<FieldError>{fields.actionTaken.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<SelectField
								meta={fields.severity}
								items={['Low', 'Medium', 'High', 'Critical'].map(severity => ({
									name: severity,
									value: severity,
								}))}
								placeholder="Select a severity"
							/>
							{fields.severity.errors && (
								<FieldError>{fields.severity.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<SelectField
								meta={fields.impactType}
								items={['Direct', 'Indirect', 'Systemic'].map(impactType => ({
									name: impactType,
									value: impactType,
								}))}
								placeholder="Select an impact type"
							/>
							{fields.impactType.errors && (
								<FieldError>{fields.impactType.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<SelectField
								meta={fields.likelihood}
								items={['Low', 'Medium', 'High', 'Critical'].map(
									likelihood => ({
										name: likelihood,
										value: likelihood,
									}),
								)}
								placeholder="Select a likelihood"
							/>
							{fields.likelihood.errors && (
								<FieldError>{fields.likelihood.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<TextareaField
								meta={fields.training}
								autoComplete="off"
								placeholder="Training"
								className="h-10 w-full"
							/>
							{fields.training.errors && (
								<FieldError>{fields.training.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<TextareaField
								meta={fields.changeOfProcedure}
								autoComplete="off"
								placeholder="Change of Procedure"
								className="h-10 w-full"
							/>
							{fields.changeOfProcedure.errors && (
								<FieldError>{fields.changeOfProcedure.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<TextareaField
								meta={fields.physicalMeasures}
								autoComplete="off"
								placeholder="Physical Measures"
								className="h-10 w-full"
							/>
							{fields.physicalMeasures.errors && (
								<FieldError>{fields.physicalMeasures.errors}</FieldError>
							)}
						</div>

						<div className="w-full">
							<SelectField
								meta={fields.status}
								items={['Open', 'Closed'].map(status => ({
									name: status,
									value: status,
								}))}
								placeholder="Select a status"
							/>
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
