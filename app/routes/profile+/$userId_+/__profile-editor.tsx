import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
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

import {
	Country,
	Department,
	Employee,
	Floor,
	Location,
	Organ,
	User,
} from '@prisma/client'
import { ErrorList } from '~/components/ErrorList'
import { Separator } from '~/components/ui/separator'
import { type action } from './__profile-editor.server'

export const ProfileEditorSchema = z.object({
	id: z.string().optional(),
	firstName: z.string({ required_error: 'First Name is required' }),
	familyName: z.string({ required_error: 'Family Name is required' }),
	middleName: z.string({ required_error: 'Middle Name is required' }),
	email: z.string().optional(),
	countryId: z.string({ required_error: 'Country is required' }),
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
	organId: z.string({ required_error: 'Organ is required' }),
	departmentId: z.string({ required_error: 'Department is required' }),
	locationId: z.string({ required_error: 'Location is required' }),
	floorId: z.string({ required_error: 'Floor is required' }),
	officeNumber: z.string({ required_error: 'Office Number is required' }),
	specialConditions: z.string().optional(),
	medicallyTrained: z.boolean().optional(),
	zone: z.string().optional(),
	team: z.string().optional(),
	city: z.string({ required_error: 'City is required' }),
	subcity: z.string({ required_error: 'Subcity is required' }),
	woreda: z.string({ required_error: 'Woreda is required' }),
	street: z.string().optional(),
	kebele: z.string().optional(),
	houseNumber: z.string({ required_error: 'House Number is required' }),
	houseTelephoneNumber: z.string().optional(),
	mobileTelephoneNumber: z.string({
		required_error: 'Mobile Telephone Number is required',
	}),
	officeTelephoneNumber: z.string().optional(),
	specificLocation: z.string({
		required_error: 'Specific Location is required',
	}),
	gpsLocation: z.string().optional(),
	homeCountryAddress: z.string().optional(),
})

export function ProfileEditor({
	profile,
	countries,
	organs,
	departments,
	locations,
	floors,
	user,
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
			| 'organId'
			| 'departmentId'
			| 'locationId'
			| 'floorId'
			| 'officeNumber'
			| 'specialConditions'
			| 'medicallyTrained'
			| 'zone'
			| 'team'
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
	countries: Array<Pick<Country, 'id' | 'name'>>
	organs: Array<Pick<Organ, 'id' | 'name'>>
	departments: Array<Pick<Department, 'id' | 'name'>>
	locations: Array<Pick<Location, 'id' | 'name'>>
	floors: Array<Pick<Floor, 'id' | 'name'>>
	user: SerializeFrom<Pick<User, 'id' | 'email' | 'username' | 'name'>>
	mode: 'new' | 'edit'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'update-profile',
		constraint: getZodConstraint(ProfileEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileEditorSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...profile,
			email: user.email,
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

				<div className="space-y-2 text-center">
					<CardHeader>
						<CardTitle className="text-3xl font-bold">Duty Station</CardTitle>
						<CardDescription className="text-gray-500 dark:text-gray-400">
							Enter your duty station information
						</CardDescription>
						<Separator />
					</CardHeader>
				</div>

				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.organId.id}>Organ</Label>
							<SelectField
								meta={fields.organId}
								items={organs.map(organ => ({
									name: organ.name,
									value: organ.id,
								}))}
								placeholder="Select a organ"
							/>
							{fields.organId.errors && (
								<FieldError>{fields.organId.errors}</FieldError>
							)}
						</Field>
					</div>
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.departmentId.id}>Department</Label>
							<SelectField
								meta={fields.departmentId}
								items={departments.map(department => ({
									name: department.name,
									value: department.id,
								}))}
								placeholder="Select a department"
							/>
							{fields.departmentId.errors && (
								<FieldError>{fields.departmentId.errors}</FieldError>
							)}
						</Field>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.locationId.id}>Location</Label>
								<SelectField
									meta={fields.locationId}
									items={locations.map(location => ({
										name: location.name,
										value: location.id,
									}))}
									placeholder="Select a location"
								/>
								{fields.locationId.errors && (
									<FieldError>{fields.locationId.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.floorId.id}>Floor</Label>
								<SelectField
									meta={fields.floorId}
									items={floors.map(floor => ({
										name: floor.name,
										value: floor.id,
									}))}
									placeholder="Select a floor"
								/>
								{fields.floorId.errors && (
									<FieldError>{fields.floorId.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.officeNumber.id}>Office Number</Label>
								<InputField
									meta={fields.officeNumber}
									type="text"
									autoComplete="off"
								/>
								{fields.officeNumber.errors && (
									<FieldError>{fields.officeNumber.errors}</FieldError>
								)}
							</Field>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4 items-center">
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.zone.id}>Zone</Label>
								<InputField meta={fields.zone} type="text" autoComplete="off" />
								{fields.zone.errors && (
									<FieldError>{fields.zone.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<Label htmlFor={fields.team.id}>Team</Label>
								<InputField meta={fields.team} type="text" autoComplete="off" />
								{fields.team.errors && (
									<FieldError>{fields.team.errors}</FieldError>
								)}
							</Field>
						</div>
						<div className="space-y-2">
							<Field>
								<div className="flex items-center gap-2">
									<CheckboxField meta={fields.medicallyTrained} />
									<Label htmlFor={fields.medicallyTrained.id}>
										Medically Trained
									</Label>
								</div>
								{fields.medicallyTrained.errors && (
									<FieldError>{fields.medicallyTrained.errors}</FieldError>
								)}
							</Field>
						</div>
					</div>
				</CardContent>

				<div className="space-y-2 text-center">
					<CardHeader>
						<CardTitle className="text-3xl font-bold">
							Address Information
						</CardTitle>
						<CardDescription className="text-gray-500 dark:text-gray-400">
							Enter your address information
						</CardDescription>
						<Separator />
					</CardHeader>
				</div>

				<CardContent className="space-y-4">
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

					<ErrorList id={form.id} errors={form.errors} />
				</CardContent>

				<CardFooter className="text-center space-x-4">
					<Button
						className="w-full"
						type="submit"
						name="intent"
						value="update-profile"
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
