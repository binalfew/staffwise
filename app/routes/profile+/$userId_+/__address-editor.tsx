import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { InputField } from '~/components/conform/InputField'
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

import { Employee } from '@prisma/client'
import { Separator } from '~/components/ui/separator'
import { type action } from './__profile-editor.server'

export const AddressEditorSchema = z.object({
	id: z.string().optional(),
	city: z.string().optional(),
	subcity: z.string().optional(),
	woreda: z.string().optional(),
	street: z.string().optional(),
	kebele: z.string().optional(),
	houseNumber: z.string().optional(),
	houseTelephoneNumber: z.string().optional(),
	mobileTelephoneNumber: z.string().optional(),
	officeTelephoneNumber: z.string().optional(),
	specificLocation: z.string().optional(),
	gpsLocation: z.string().optional(),
	homeCountryAddress: z.string().optional(),
})

export function AddressEditor({
	profile,
}: {
	profile?: SerializeFrom<
		Pick<
			Employee,
			| 'id'
			| 'city'
			| 'subcity'
			| 'woreda'
			| 'street'
			| 'kebele'
			| 'houseNumber'
			| 'houseTelephoneNumber'
			| 'mobileTelephoneNumber'
			| 'officeTelephoneNumber'
			| 'specificLocation'
			| 'gpsLocation'
			| 'homeCountryAddress'
		>
	>
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'update-address',
		constraint: getZodConstraint(AddressEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: AddressEditorSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...profile,
		},
	})

	return (
		<Card className="mx-auto w-full max-w-5xl space-y-6 p-6">
			<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
				<div className="space-y-2 text-center">
					<CardHeader>
						<CardTitle className="text-3xl font-bold">Address</CardTitle>
						<CardDescription className="text-gray-500 dark:text-gray-400">
							Enter your address
						</CardDescription>
						<Separator />
					</CardHeader>
				</div>

				<CardContent className="space-y-4">
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<InputField meta={fields.id} type="hidden" />
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.city.id}>City</Label>
							<InputField meta={fields.city} type="text" autoComplete="off" />
							{fields.city.errors && (
								<FieldError>{fields.city.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.subcity.id}>Subcity</Label>
							<InputField
								meta={fields.subcity}
								type="text"
								autoComplete="off"
							/>
							{fields.subcity.errors && (
								<FieldError>{fields.subcity.errors}</FieldError>
							)}
						</Field>
					</div>
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.woreda.id}>Woreda</Label>
							<InputField meta={fields.woreda} type="text" autoComplete="off" />
							{fields.woreda.errors && (
								<FieldError>{fields.woreda.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.street.id}>Street</Label>
							<InputField meta={fields.street} type="text" autoComplete="off" />
							{fields.street.errors && (
								<FieldError>{fields.street.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.kebele.id}>Kebele</Label>
							<InputField meta={fields.kebele} type="text" autoComplete="off" />
							{fields.kebele.errors && (
								<FieldError>{fields.kebele.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.houseNumber.id}>House Number</Label>
							<InputField
								meta={fields.houseNumber}
								type="text"
								autoComplete="off"
							/>
							{fields.houseNumber.errors && (
								<FieldError>{fields.houseNumber.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.houseTelephoneNumber.id}>
								House Telephone Number
							</Label>
							<InputField
								meta={fields.houseTelephoneNumber}
								type="text"
								autoComplete="off"
							/>
							{fields.houseTelephoneNumber.errors && (
								<FieldError>{fields.houseTelephoneNumber.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.mobileTelephoneNumber.id}>
								Mobile Telephone Number
							</Label>
							<InputField
								meta={fields.mobileTelephoneNumber}
								type="text"
								autoComplete="off"
							/>
							{fields.mobileTelephoneNumber.errors && (
								<FieldError>{fields.mobileTelephoneNumber.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.officeTelephoneNumber.id}>
								Office Telephone Number
							</Label>
							<InputField
								meta={fields.officeTelephoneNumber}
								type="text"
								autoComplete="off"
							/>
							{fields.officeTelephoneNumber.errors && (
								<FieldError>{fields.officeTelephoneNumber.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.specificLocation.id}>
								Specific Location
							</Label>
							<InputField
								meta={fields.specificLocation}
								type="text"
								autoComplete="off"
							/>
							{fields.specificLocation.errors && (
								<FieldError>{fields.specificLocation.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.gpsLocation.id}>GPS Location</Label>
							<InputField
								meta={fields.gpsLocation}
								type="text"
								autoComplete="off"
							/>
							{fields.gpsLocation.errors && (
								<FieldError>{fields.gpsLocation.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.homeCountryAddress.id}>
								Home Country Address
							</Label>
							<InputField
								meta={fields.homeCountryAddress}
								type="text"
								autoComplete="off"
							/>
							{fields.homeCountryAddress.errors && (
								<FieldError>{fields.homeCountryAddress.errors}</FieldError>
							)}
						</Field>
					</div>
				</CardContent>

				<CardFooter className="text-center space-x-4">
					<Button
						className="w-full"
						type="submit"
						name="intent"
						value="update-address"
					>
						Update
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link to={`/profile/${params.userId}`}>Cancel</Link>
					</Button>
				</CardFooter>
			</Form>
		</Card>
	)
}
