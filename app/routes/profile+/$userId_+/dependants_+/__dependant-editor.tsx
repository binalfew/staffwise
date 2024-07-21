import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Dependant } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { type action } from './__dependant-editor.server'

export const DependantEditorSchema = z.object({
	id: z.string().optional(),
	firstName: z.string({ required_error: 'First Name is required' }),
	familyName: z.string({ required_error: 'Family Name is required' }),
	middleName: z.string().optional(),
	auIdNumber: z.string({ required_error: 'AU ID Number is required' }),
	dateIssued: z.date({ required_error: 'Date Issued is required' }),
	validUntil: z.date({ required_error: 'Valid Until is required' }),
	dateOfBirth: z.date({ required_error: 'Date of Birth is required' }),
	relationshipId: z.string({ required_error: 'Relationship is required' }),
	nameOfSchool: z
		.string({ required_error: 'Name of School is required' })
		.optional(),
})

export const DependantDeleteSchema = z.object({
	id: z.string(),
})

export function DependantEditor({
	dependant,
	relationships,
	title,
	intent,
	description,
}: {
	dependant?: SerializeFrom<
		Pick<
			Dependant,
			| 'id'
			| 'firstName'
			| 'familyName'
			| 'middleName'
			| 'auIdNumber'
			| 'dateIssued'
			| 'validUntil'
			| 'dateOfBirth'
			| 'relationshipId'
			| 'nameOfSchool'
		>
	>
	relationships: Array<{ id: string; name: string }>
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? DependantDeleteSchema : DependantEditorSchema
	const [form, fields] = useForm({
		id: 'dependant-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: dependant || {},
	})

	const formItems = [
		{
			field: fields.id,
			type: 'hidden' as const,
		},
		{
			label: 'First Name',
			field: fields.firstName,
			disabled,
			errors: fields.firstName.errors,
			type: 'text' as const,
		},
		{
			label: 'Family Name',
			field: fields.familyName,
			disabled,
			errors: fields.familyName.errors,
			type: 'text' as const,
		},
		{
			label: 'Middle Name',
			field: fields.middleName,
			disabled,
			errors: fields.middleName.errors,
			type: 'text' as const,
		},
		{
			label: 'AU ID Number',
			field: fields.auIdNumber,
			disabled,
			errors: fields.auIdNumber.errors,
			type: 'text' as const,
		},
		{
			label: 'Date Issued',
			field: fields.dateIssued,
			disabled,
			errors: fields.dateIssued.errors,
			type: 'date' as const,
		},
		{
			label: 'Valid Until',
			field: fields.validUntil,
			disabled,
			errors: fields.validUntil.errors,
			type: 'date' as const,
		},
		{
			label: 'Date of Birth',
			field: fields.dateOfBirth,
			disabled,
			errors: fields.dateOfBirth.errors,
			type: 'date' as const,
		},
		{
			label: 'Relationship',
			field: fields.relationshipId,
			disabled,
			errors: fields.relationshipId.errors,
			type: 'select' as const,
			data: relationships.map(r => ({ name: r.name, value: r.id })),
		},
		{
			label: 'Name of School',
			field: fields.nameOfSchool,
			disabled,
			errors: fields.nameOfSchool.errors,
			type: 'text' as const,
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
						<Link to={`/profile/${params.userId}/dependants`}>Cancel</Link>
					</Button>
				</>
			}
		/>
	)
}
