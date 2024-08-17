import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { AccessRequest, Visitor } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useActionData, useParams } from '@remix-run/react'
import { PlusCircle, TrashIcon } from 'lucide-react'
import { z } from 'zod'
import FormCard from '~/components/FormCard'
import FormField from '~/components/FormField'
import { Button } from '~/components/ui/button'
import { StatusButton } from '~/components/ui/status-button'
import { useIsPending } from '~/utils/misc'
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

export const AccessRequestEditorSchema = z
	.object({
		id: z.string().optional(),
		requestNumber: z.string().optional(),
		startDate: z.date({ required_error: 'Start date is required' }),
		endDate: z.date({ required_error: 'End date is required' }),
		requestor: z.string().optional(),
		visitors: z.array(VisitorFieldsetSchema).optional(),
	})
	.refine(data => data.endDate >= data.startDate, {
		message: 'End date cannot be earlier than start date',
		path: ['endDate'],
	})

export const AccessRequestDeleteSchema = z.object({
	id: z.string(),
})

export function AccessRequestEditor({
	accessRequest,
	requestor,
	title,
	intent,
	description,
}: {
	accessRequest?: SerializeFrom<
		Pick<AccessRequest, 'id' | 'requestNumber' | 'startDate' | 'endDate'> & {
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
				>
			>
		}
	>
	requestor: string
	title: string
	description: string
	intent: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
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
			requestNumber: accessRequest?.requestNumber ?? 'New',
			requestor: requestor,
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
			label: 'Requestor',
			field: fields.requestor,
			disabled: true,
			type: 'text' as const,
		},
		{
			label: 'Request Number',
			field: fields.requestNumber,
			disabled: true,
			type: 'text' as const,
		},
		{
			label: 'Start Date',
			field: fields.startDate,
			disabled: disabled,
			errors: fields.startDate.errors,
			type: 'date' as const,
		},
		{
			label: 'End Date',
			field: fields.endDate,
			disabled: disabled,
			errors: fields.endDate.errors,
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
				<fieldset className="border p-4 rounded-md" key="request">
					<legend className="text-md px-2 font-semibold text-gray-500">
						Request
					</legend>
					<div className="mb-4">
						<FormField item={formItems[0]} />
						<FormField item={formItems[1]} />
					</div>

					<div className="mb-4">
						<FormField item={formItems[2]} />
					</div>

					<div className="flex space-x-4">
						{formItems.slice(3).map((item, index) => (
							<div key={index} className="flex-1">
								<FormField item={item} />
							</div>
						))}
					</div>
				</fieldset>,

				<fieldset className="border p-4 rounded-md" key="visitors">
					<legend className="text-md px-2 font-semibold text-gray-500">
						Visitors
					</legend>
					<div className="flex space-x-4 border-b pb-2 mb-4">
						<div className="flex-1">First Name</div>
						<div className="flex-1">Family Name</div>
						<div className="flex-1">Telephone</div>
						<div className="flex-1">Organization</div>
						<div className="flex-1">Whom to visit</div>
						<div className="flex-1">Destination</div>
						<div className="flex-1">
							<div
								className={
									['add', 'edit'].includes(intent)
										? 'flex items-center justify-end'
										: ''
								}
							>
								Plate Number
								{['add', 'edit'].includes(intent) && (
									<Button
										{...form.insert.getButtonProps({
											name: fields.visitors.name,
										})}
										size="sm"
										className="ml-2"
									>
										<PlusCircle className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>
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
												intent === 'delete' ? null : (
													<Button
														{...form.remove.getButtonProps({
															name: fields.visitors.name,
															index,
														})}
														variant="destructive"
														size="sm"
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
				</fieldset>,
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
					<Link to={`/profile/${params.userId}/access-requests`}>Cancel</Link>
				</Button>,
			]}
		/>
	)
}
