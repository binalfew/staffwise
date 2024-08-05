import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Vehicle } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { StatusButton } from '~/components/ui/status-button'
import { useIsPending } from '~/utils/misc'
import { type action } from './__vehicle-editor.server'

export const VehicleEditorSchema = z.object({
	id: z.string().optional(),
	make: z.string({ required_error: 'Make is required' }),
	model: z.string({ required_error: 'Model is required' }),
	year: z.string({ required_error: 'Year is required' }),
	color: z.string({ required_error: 'Color is required' }),
	plateNumber: z.string({ required_error: 'Plate Number is required' }),
	capacity: z.string({ required_error: 'Capacity is required' }),
	ownership: z.enum(['OWNER', 'RENTAL']),
})

export const VehicleDeleteSchema = z.object({
	id: z.string(),
})

export function VehicleEditor({
	vehicle,
	title,
	description,
	intent,
}: {
	vehicle?: SerializeFrom<
		Pick<
			Vehicle,
			| 'id'
			| 'make'
			| 'model'
			| 'year'
			| 'color'
			| 'plateNumber'
			| 'capacity'
			| 'ownership'
		>
	>
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const disabled = intent === 'delete'
	const schema = intent === 'delete' ? VehicleDeleteSchema : VehicleEditorSchema
	const [form, fields] = useForm({
		id: 'vehicle-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: vehicle || {},
	})

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			label: 'Make',
			field: fields.make,
			disabled,
			errors: fields.make.errors,
			type: 'text' as const,
		},
		{
			label: 'Model',
			field: fields.model,
			disabled,
			errors: fields.model.errors,
			type: 'text' as const,
		},
		{
			label: 'Year',
			field: fields.year,
			disabled,
			errors: fields.year.errors,
			type: 'text' as const,
		},
		{
			label: 'Color',
			field: fields.color,
			disabled,
			errors: fields.color.errors,
			type: 'text' as const,
		},
		{
			label: 'Plate Number',
			field: fields.plateNumber,
			disabled,
			errors: fields.plateNumber.errors,
			type: 'text' as const,
		},
		{
			label: 'Capacity',
			field: fields.capacity,
			disabled,
			errors: fields.capacity.errors,
			type: 'text' as const,
		},
		{
			label: 'Ownership',
			field: fields.ownership,
			disabled,
			errors: fields.ownership.errors,
			type: 'select' as const,
			data: [
				{ name: 'OWNER', value: 'OWNER' },
				{ name: 'RENTAL', value: 'RENTAL' },
			],
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
				<StatusButton
					key="submit"
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : actionData?.result.status ?? 'idle'}
					className="w-full"
					name="intent"
					value={intent}
					variant={intent === 'delete' ? 'destructive' : 'default'}
				>
					{intent === 'delete' ? 'Delete' : 'Save'}
				</StatusButton>,
				<Button key="cancel" asChild variant="outline" className="w-full">
					<Link to={`/profile/${params.userId}/vehicles`}>Cancel</Link>
				</Button>,
			]}
		/>
	)
}
