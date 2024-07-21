import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { AccessRequest, Visitor } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { TrashIcon } from 'lucide-react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { type action } from './__access-request-editor.server'

const VisitorFieldsetSchema = z.object({
	id: z.string().optional(),
	firstName: z.string(),
	familyName: z.string(),
	telephone: z.string(),
	organization: z.string(),
	whomToVisit: z.string(),
	destination: z.string(),
	carPlateNumber: z.string().optional(),
})

type VisitorFieldset = z.infer<typeof VisitorFieldsetSchema>

export function visitorHasId(
	visitor: VisitorFieldset,
): visitor is VisitorFieldset & {
	id: NonNullable<VisitorFieldset['id']>
} {
	return visitor.id != null
}

export const AccessRequestEditorSchema = z.object({
	id: z.string().optional(),
	requestNumber: z.string().optional(),
	visitors: z.array(VisitorFieldsetSchema).optional(),
})

export const AccessRequestDeleteSchema = z.object({
	id: z.string(),
})

export function AccessRequestEditor({
	accessRequest,
	title,
	intent,
	description,
}: {
	accessRequest?: SerializeFrom<
		Pick<AccessRequest, 'id' | 'requestNumber'> & {
			visitors?: Array<
				Pick<
					Visitor,
					| 'id'
					| 'firstName'
					| 'familyName'
					| 'telephone'
					| 'organization'
					| 'whomToVisit'
					| 'destination'
					| 'carPlateNumber'
					| 'timeIn'
					| 'timeOut'
				>
			>
		}
	>
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const schema =
		intent === 'delete' ? AccessRequestDeleteSchema : AccessRequestEditorSchema
	const [form, fields] = useForm({
		id: 'access-request-form',
		constraint: getZodConstraint(schema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...accessRequest,
			requestNumber: 'Request Number: New',
			visitors: accessRequest?.visitors ?? [
				{
					firstName: '',
					familyName: '',
					telephone: '',
					organization: '',
					whomToVisit: '',
					destination: '',
					carPlateNumber: '',
				},
			],
		},
	})

	const visitors = fields.visitors.getFieldList()

	const formItems = [
		{
			type: 'hidden' as const,
			field: fields.id,
		},
		{
			field: fields.requestNumber,
			disabled: true,
			errors: fields.requestNumber.errors,
			type: 'text' as const,
			addon: (
				<Button
					{...form.insert.getButtonProps({
						name: fields.visitors.name,
					})}
				>
					Add
				</Button>
			),
		},
	]

	return (
		<FormCard
			title={title}
			description={description}
			intent={intent}
			form={form}
			fields={
				<>
					{formItems.map((item, index) => (
						<FormField key={index} item={item} />
					))}

					<div className="flex space-x-4">
						<div className="flex-1">First Name</div>
						<div className="flex-1">Family Name</div>
						<div className="flex-1">Telephone</div>
						<div className="flex-1">Organization</div>
						<div className="flex-1">Whom to visit</div>
						<div className="flex-1">Destination</div>
						<div className="flex-1">Plate Number</div>
					</div>

					{visitors.map((visitor, index) => {
						const visitorFields = visitor.getFieldset()
						return (
							<div key={index} className="flex space-x-4">
								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.firstName,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.firstName.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.familyName,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.familyName.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.telephone,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.telephone.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.organization,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.organization.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.whomToVisit,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.whomToVisit.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.destination,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.destination.errors,
										}}
									/>
								</div>

								<div className="flex-1">
									<FormField
										item={{
											field: visitorFields.carPlateNumber,
											type: 'text' as const,
											label: '',
											disabled: disabled,
											errors: visitorFields.carPlateNumber.errors,
											addon:
												index === 0 ? null : (
													<Button
														{...form.remove.getButtonProps({
															name: fields.visitors.name,
															index,
														})}
														variant="destructive"
														size={'xs'}
													>
														<TrashIcon className="h-4 w-4" />
													</Button>
												),
										}}
									/>
								</div>
							</div>
						)
					})}
				</>
			}
			buttons={
				<>
					<Button
						className="w-full"
						type="submit"
						name="intent"
						value={intent}
						variant={intent === 'delete' ? 'destructive' : 'default'}
					>
						{intent === 'delete' ? 'Delete' : 'Save'}
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link to={`/profile/${params.userId}/access-requests`}>Cancel</Link>
					</Button>
				</>
			}
		/>
	)
}
