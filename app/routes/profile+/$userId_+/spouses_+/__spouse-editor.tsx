import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Spouse } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { type action } from './__spouse-editor.server'

export const SpouseEditorSchema = z
	.object({
		id: z.string().optional(),
		firstName: z.string({ required_error: 'First Name is required' }),
		familyName: z.string({ required_error: 'Family Name is required' }),
		middleName: z.string({ required_error: 'Middle Name is required' }),
		auIdNumber: z.string().optional(),
		dateIssued: z.date().optional(),
		validUntil: z.date().optional(),
		telephoneNumber: z.string().optional(),
		dateOfBirth: z.date().optional(),
	})
	.refine(data => !data.auIdNumber || data.dateIssued, {
		message: 'Date Issued is required',
		path: ['dateIssued'],
	})
	.refine(data => !data.auIdNumber || data.validUntil, {
		message: 'Valid Until is required',
		path: ['validUntil'],
	})
	.refine(
		data =>
			!data.dateIssued ||
			!data.validUntil ||
			data.validUntil >= data.dateIssued,
		{
			message: 'Valid Until cannot be earlier than Date Issued',
			path: ['validUntil'],
		},
	)
	.refine(data => !(data.dateIssued && data.validUntil) || data.auIdNumber, {
		message: 'AU ID Number is required',
		path: ['auIdNumber'],
	})

export const SpouseDeleteSchema = z.object({
	id: z.string(),
})

export function SpouseEditor({
	spouse,
	title,
	intent,
	description,
}: {
	spouse?: SerializeFrom<
		Pick<
			Spouse,
			| 'id'
			| 'firstName'
			| 'familyName'
			| 'middleName'
			| 'auIdNumber'
			| 'dateIssued'
			| 'validUntil'
			| 'telephoneNumber'
			| 'dateOfBirth'
		>
	>
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? SpouseDeleteSchema : SpouseEditorSchema
	const [form, fields] = useForm({
		id: 'spouse-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...spouse,
		},
	})

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
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
			label: 'Telephone Number',
			field: fields.telephoneNumber,
			disabled,
			errors: fields.telephoneNumber.errors,
			type: 'text' as const,
		},
		{
			label: 'Date of Birth',
			field: fields.dateOfBirth,
			disabled,
			errors: fields.dateOfBirth.errors,
			type: 'date' as const,
		},
	]

	return (
		<FormCard
			title={title}
			description={description}
			intent={intent}
			form={form}
			fields={[
				formItems.map((item, index) => <FormField key={index} item={item} />),
			]}
			buttons={[
				<Button
					key="submit"
					className="w-full"
					type="submit"
					name="intent"
					value={intent}
					variant={intent === 'delete' ? 'destructive' : 'default'}
				>
					{intent === 'delete' ? 'Delete' : 'Save'}
				</Button>,
				<Button key="cancel" asChild variant="outline" className="w-full">
					<Link to={`/profile/${params.userId}/spouses`}>Cancel</Link>
				</Button>,
			]}
		/>
	)
}
