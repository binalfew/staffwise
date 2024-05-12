import { FormProvider, getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Assessment, Incident, IncidentType } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { DatePickerField } from '~/components/conform/DatePickerField'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { type action } from './__incident-editor.server'

export const AssessmentFieldsetSchema = z.object({
	id: z.string().optional(),
	cause: z.string().optional(),
	actionTaken: z.string().optional(),
	severity: z.string().optional(),
	impactType: z.string().optional(),
	likelihood: z.string().optional(),
	training: z.string().optional(),
	changeOfProcedure: z.string().optional(),
	physicalMeasures: z.string().optional(),
	status: z.string().optional(),
	officer: z.string().optional(),
})

export type AssessmentFieldset = z.infer<typeof AssessmentFieldsetSchema>

export const IncidentEditorSchema = z.object({
	id: z.string().optional(),
	incidentTypeId: z.string({ required_error: 'Incident Type is required' }),
	location: z.string({ required_error: 'Location is required' }),
	description: z.string({ required_error: 'Description is required' }),
	eyeWitnesses: z.string({ required_error: 'Eye Witnesses is required' }),
	occuredWhile: z.string({ required_error: 'Occured While is required' }),
	occuredAt: z.date({ required_error: 'Occured At is required' }),
	assessment: AssessmentFieldsetSchema.optional(),
})

export function IncidentEditor({
	incident,
	incidentTypes,
	title,
	intent,
}: {
	incident?: SerializeFrom<
		Pick<
			Incident,
			| 'id'
			| 'employeeId'
			| 'incidentNumber'
			| 'incidentTypeId'
			| 'location'
			| 'description'
			| 'eyeWitnesses'
			| 'occuredWhile'
			| 'occuredAt'
		> & {
			assessment: Pick<
				Assessment,
				| 'id'
				| 'cause'
				| 'actionTaken'
				| 'severity'
				| 'impactType'
				| 'likelihood'
				| 'training'
				| 'changeOfProcedure'
				| 'physicalMeasures'
				| 'status'
				| 'officer'
			>
		}
	>
	incidentTypes: SerializeFrom<Pick<IncidentType, 'id' | 'name'>>[]
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const [form, fields] = useForm({
		id: 'register-incident',
		constraint: getZodConstraint(IncidentEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: IncidentEditorSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...incident,
			assessment: {
				...incident?.assessment,
			},
		},
	})

	const assessment = fields.assessment.getFieldset()

	return (
		<div className="flex flex-col gap-8">
			<Card className="mx-auto w-full max-w-5xl space-y-6 p-6">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this incident? This action cannot
							be undone.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<FormProvider context={form.context}>
						<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
							<AuthenticityTokenInput />
							<HoneypotInputs />
							<InputField meta={fields.id} type="hidden" />
							<Field>
								<Label
									htmlFor={fields.incidentTypeId.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Incident Type
								</Label>
								<SelectField
									meta={fields.incidentTypeId}
									disabled={disabled}
									items={incidentTypes.map(incidentType => ({
										name: incidentType.name,
										value: incidentType.id,
									}))}
									placeholder="Select Incident Type"
								/>
								{fields.incidentTypeId.errors && (
									<FieldError>{fields.incidentTypeId.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={fields.location.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Location
								</Label>
								<InputField
									meta={fields.location}
									type="text"
									disabled={disabled}
								/>
								{fields.location.errors && (
									<FieldError>{fields.location.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={fields.description.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Description
								</Label>
								<InputField
									meta={fields.description}
									type="text"
									disabled={disabled}
								/>
								{fields.description.errors && (
									<FieldError>{fields.description.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={fields.eyeWitnesses.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Eye Witnesses
								</Label>
								<InputField
									meta={fields.eyeWitnesses}
									type="text"
									disabled={disabled}
								/>
								{fields.eyeWitnesses.errors && (
									<FieldError>{fields.eyeWitnesses.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={fields.occuredWhile.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Occured While
								</Label>
								<InputField
									meta={fields.occuredWhile}
									type="text"
									disabled={disabled}
								/>
								{fields.occuredWhile.errors && (
									<FieldError>{fields.occuredWhile.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={fields.occuredAt.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Occured At
								</Label>
								<DatePickerField meta={fields.occuredAt} />

								{fields.occuredAt.errors && (
									<FieldError>{fields.occuredAt.errors}</FieldError>
								)}
							</Field>

							<CardTitle className="mt-2">Assessment</CardTitle>

							<Separator />

							<Field>
								<Label
									htmlFor={assessment.cause.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Cause
								</Label>
								<InputField
									meta={assessment.cause}
									type="text"
									disabled={disabled}
								/>
								{assessment.cause.errors && (
									<FieldError>{assessment.cause.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.actionTaken.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Action Taken
								</Label>
								<InputField
									meta={assessment.actionTaken}
									type="text"
									disabled={disabled}
								/>
								{assessment.actionTaken.errors && (
									<FieldError>{assessment.actionTaken.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.severity.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Severity
								</Label>
								<InputField
									meta={assessment.severity}
									type="text"
									disabled={disabled}
								/>
								{assessment.severity.errors && (
									<FieldError>{assessment.severity.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.impactType.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Impact Type
								</Label>
								<InputField
									meta={assessment.impactType}
									type="text"
									disabled={disabled}
								/>
								{assessment.impactType.errors && (
									<FieldError>{assessment.impactType.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.likelihood.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Likelihood
								</Label>
								<InputField
									meta={assessment.likelihood}
									type="text"
									disabled={disabled}
								/>
								{assessment.likelihood.errors && (
									<FieldError>{assessment.likelihood.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.training.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Training
								</Label>
								<InputField
									meta={assessment.training}
									type="text"
									disabled={disabled}
								/>
								{assessment.training.errors && (
									<FieldError>{assessment.training.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.changeOfProcedure.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Change Of Procedure
								</Label>
								<InputField
									meta={assessment.changeOfProcedure}
									type="text"
									disabled={disabled}
								/>
								{assessment.changeOfProcedure.errors && (
									<FieldError>{assessment.changeOfProcedure.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.physicalMeasures.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Physical Measures
								</Label>
								<InputField
									meta={assessment.physicalMeasures}
									type="text"
									disabled={disabled}
								/>
								{assessment.physicalMeasures.errors && (
									<FieldError>{assessment.physicalMeasures.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.status.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Status
								</Label>
								<InputField
									meta={assessment.status}
									type="text"
									disabled={disabled}
								/>
								{assessment.status.errors && (
									<FieldError>{assessment.status.errors}</FieldError>
								)}
							</Field>

							<Field>
								<Label
									htmlFor={assessment.officer.id}
									className={disabled ? 'text-muted-foreground' : ''}
								>
									Officer
								</Label>
								<InputField
									meta={assessment.officer}
									type="text"
									disabled={disabled}
								/>
								{assessment.officer.errors && (
									<FieldError>{assessment.officer.errors}</FieldError>
								)}
							</Field>
						</Form>
					</FormProvider>
				</CardContent>
				<CardFooter className="border-t px-6 py-4">
					<div className="flex items-center justify-end space-x-2">
						<Button
							type="submit"
							form={form.id}
							name="intent"
							value={intent}
							variant={intent === 'delete' ? 'destructive' : 'default'}
						>
							{intent === 'delete' ? 'Delete' : 'Save'}
						</Button>
						<Button asChild variant="outline">
							<Link to="/settings/incidents">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
