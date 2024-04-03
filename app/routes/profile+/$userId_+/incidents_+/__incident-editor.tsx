import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Incident, IncidentType } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
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
import { type action } from './__incident-editor.server'

export const IncidentEditorSchema = z.object({
	id: z.string().optional(),
	incidentTypeId: z.string({ required_error: 'Incident Type is required' }),
	location: z.string({ required_error: 'Location is required' }),
	description: z.string({ required_error: 'Description is required' }),
	eyeWitnesses: z.string({ required_error: 'Eye Witnesses is required' }),
	occuredWhile: z.string({ required_error: 'Occured While is required' }),
	occuredAt: z.date({ required_error: 'Occured At is required' }),
})

export const IncidentDeleteSchema = z.object({
	id: z.string(),
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
		>
	>
	incidentTypes: SerializeFrom<Pick<IncidentType, 'id' | 'name'>>[]
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? IncidentDeleteSchema : IncidentEditorSchema
	const [form, fields] = useForm({
		id: 'register-incident',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...incident,
		},
	})

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

						{/* Location */}
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
								placeholder="Location"
							/>
							{fields.location.errors && (
								<FieldError>{fields.location.errors}</FieldError>
							)}
						</Field>

						{/* Description */}
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
								placeholder="Description"
							/>
							{fields.description.errors && (
								<FieldError>{fields.description.errors}</FieldError>
							)}
						</Field>

						{/* Eye Witnesses */}
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
								placeholder="Eye Witnesses"
							/>
							{fields.eyeWitnesses.errors && (
								<FieldError>{fields.eyeWitnesses.errors}</FieldError>
							)}
						</Field>

						{/* Occured While */}
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
								placeholder="Occured While"
							/>
							{fields.occuredWhile.errors && (
								<FieldError>{fields.occuredWhile.errors}</FieldError>
							)}
						</Field>

						{/* Occured At */}
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
					</Form>
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
							<Link to={`/profile/${params.userId}/incidents`}>Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
