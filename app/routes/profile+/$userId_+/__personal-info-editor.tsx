import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
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

import { Country, Employee } from '@prisma/client'
import { Separator } from '~/components/ui/separator'
import { type action } from './__profile-editor.server'

export const PersonalInfoEditorSchema = z.object({
	id: z.string().optional(),
	firstName: z.string({ required_error: 'First Name is required' }),
	familyName: z.string({ required_error: 'Family Name is required' }),
	middleName: z.string({ required_error: 'Middle Name is required' }),
	email: z.string().optional(),
	countryId: z.string({ required_error: 'Country ID is required' }),
	nationalPassportNumber: z.string({
		required_error: 'National Passport Number is required',
	}),
	auPassportNumber: z.string({
		required_error: 'AU Passport Number is required',
	}),
	auIdNumber: z.string({ required_error: 'AU ID Number is required' }),
	dateIssued: z.date({ required_error: 'Date Issued is required' }),
	validUntil: z.date({ required_error: 'Valid Until is required' }),
	dateOfBirth: z
		.date({
			required_error: 'Date of birth is required',
			invalid_type_error: 'Invalid date',
		})
		.max(new Date(), { message: 'Date of birth cannot be in the future' }),
	specialConditions: z.string().optional(),
})

export function PersonalInfoEditor({
	profile,
	countries,
}: {
	profile?: SerializeFrom<
		Pick<
			Employee,
			| 'id'
			| 'firstName'
			| 'middleName'
			| 'familyName'
			| 'email'
			| 'countryId'
			| 'nationalPassportNumber'
			| 'auPassportNumber'
			| 'auIdNumber'
			| 'dateIssued'
			| 'validUntil'
			| 'dateOfBirth'
			| 'specialConditions'
		>
	>
	countries: Array<Pick<Country, 'id' | 'name'>>
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'update-personal-info',
		constraint: getZodConstraint(PersonalInfoEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PersonalInfoEditorSchema })
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
						<CardTitle className="text-3xl font-bold">
							Personal Information
						</CardTitle>
						<CardDescription className="text-gray-500 dark:text-gray-400">
							Enter your personal information
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
							<Label htmlFor={fields.email.id}>Email</Label>
							<InputField
								meta={fields.email}
								type="text"
								autoComplete="off"
								disabled
							/>
							{fields.email.errors && (
								<FieldError>{fields.email.errors}</FieldError>
							)}
						</Field>
					</div>
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.firstName.id}>First Name</Label>
								<InputField
									meta={fields.firstName}
									type="text"
									autoComplete="off"
								/>
								{fields.firstName.errors && (
									<FieldError>{fields.firstName.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.middleName.id}>Middle Name</Label>
								<InputField
									meta={fields.middleName}
									type="text"
									autoComplete="off"
								/>
								{fields.middleName.errors && (
									<FieldError>{fields.middleName.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.familyName.id}>Family Name</Label>
								<InputField
									meta={fields.familyName}
									type="text"
									autoComplete="off"
								/>
								{fields.familyName.errors && (
									<FieldError>{fields.familyName.errors}</FieldError>
								)}
							</Field>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.countryId.id}>Country</Label>
								<SelectField
									meta={fields.countryId}
									items={countries.map(country => ({
										name: country.name,
										value: country.id,
									}))}
									placeholder="Select a country"
								/>
								{fields.countryId.errors && (
									<FieldError>{fields.countryId.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.nationalPassportNumber.id}>
									National Passport Number
								</Label>
								<InputField
									meta={fields.nationalPassportNumber}
									type="text"
									autoComplete="off"
								/>
								{fields.nationalPassportNumber.errors && (
									<FieldError>
										{fields.nationalPassportNumber.errors}
									</FieldError>
								)}
							</Field>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.auPassportNumber.id}>
									AU Passport Number
								</Label>
								<InputField
									meta={fields.auPassportNumber}
									type="text"
									autoComplete="off"
								/>
								{fields.auPassportNumber.errors && (
									<FieldError>{fields.auPassportNumber.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.auIdNumber.id}>AU ID Number</Label>
								<InputField
									meta={fields.auIdNumber}
									type="text"
									autoComplete="off"
								/>
								{fields.auIdNumber.errors && (
									<FieldError>{fields.auIdNumber.errors}</FieldError>
								)}
							</Field>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.dateIssued.id}>Date Issued</Label>
								<DatePickerField meta={fields.dateIssued} />
								{fields.dateIssued.errors && (
									<FieldError>{fields.dateIssued.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.validUntil.id}>Valid Until</Label>
								<DatePickerField meta={fields.validUntil} />
								{fields.validUntil.errors && (
									<FieldError>{fields.validUntil.errors}</FieldError>
								)}
							</Field>
						</div>
					</div>
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.dateOfBirth.id}>Date of Birth</Label>
							<DatePickerField meta={fields.dateOfBirth} />
							{fields.dateOfBirth.errors && (
								<FieldError>{fields.dateOfBirth.errors}</FieldError>
							)}
						</Field>
					</div>
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.specialConditions.id}>
								Special Condition
							</Label>
							<InputField
								meta={fields.specialConditions}
								type="text"
								autoComplete="off"
							/>
							{fields.specialConditions.errors && (
								<FieldError>{fields.specialConditions.errors}</FieldError>
							)}
						</Field>
					</div>
				</CardContent>

				<CardFooter className="text-center space-x-4">
					<Button
						className="w-full"
						type="submit"
						name="intent"
						value="update-personal-info"
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
