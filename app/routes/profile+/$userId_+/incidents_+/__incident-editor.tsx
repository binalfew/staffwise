import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Incident, IncidentType } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
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
	description,
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
	description: string
	intent: 'add' | 'edit' | 'delete'
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
	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			label: 'Incident Type',
			field: fields.incidentTypeId,
			disabled,
			errors: fields.incidentTypeId.errors,
			type: 'select' as const,
			data: incidentTypes.map(incidentType => ({
				name: incidentType.name,
				value: incidentType.id,
			})),
		},
		{
			label: 'Location',
			field: fields.location,
			disabled,
			errors: fields.location.errors,
			type: 'text' as const,
		},
		{
			label: 'Description',
			field: fields.description,
			disabled,
			errors: fields.description.errors,
			type: 'text' as const,
		},
		{
			label: 'Eye Witnesses',
			field: fields.eyeWitnesses,
			disabled,
			errors: fields.eyeWitnesses.errors,
			type: 'text' as const,
		},
		{
			label: 'Occured While',
			field: fields.occuredWhile,
			disabled,
			errors: fields.occuredWhile.errors,
			type: 'text' as const,
		},
		{
			label: 'Occured At',
			field: fields.occuredAt,
			disabled,
			errors: fields.occuredAt.errors,
			type: 'date' as const,
		},
	]

	return (
		<FormCard
			form={form}
			title={title}
			description={description}
			intent={intent}
			fields={
				<>
					{formItems.map((item, index) => (
						<FormField key={index} item={item} />
					))}
				</>
			}
			buttons={
				<>
					<Button
						type="submit"
						form={form.id}
						name="intent"
						value={intent}
						variant={intent === 'delete' ? 'destructive' : 'default'}
						className="w-full"
					>
						{intent === 'delete' ? 'Delete' : 'Save'}
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link to={`/profile/${params.userId}/incidents`}>Cancel</Link>
					</Button>
				</>
			}
		/>
	)
}
