import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useParams } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
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

import { Department, Employee, Floor, Location, Organ } from '@prisma/client'
import { Separator } from '~/components/ui/separator'
import { type action } from './__profile-editor.server'

export const DutyStationEditorSchema = z.object({
	id: z.string().optional(),
	organId: z.string({ required_error: 'Organ ID is required' }),
	departmentId: z.string({ required_error: 'Department is required' }),
	locationId: z.string({ required_error: 'Location ID is required' }),
	floorId: z.string({ required_error: 'Floor ID is required' }),
	officeNumber: z.string({ required_error: 'Office Number is required' }),
	medicallyTrained: z.boolean().optional(),
	zone: z.string().optional(),
	team: z.string().optional(),
})

export function DutyStationEditor({
	profile,
	organs,
	departments,
	locations,
	floors,
}: {
	profile?: SerializeFrom<
		Pick<
			Employee,
			| 'id'
			| 'organId'
			| 'departmentId'
			| 'locationId'
			| 'floorId'
			| 'officeNumber'
			| 'medicallyTrained'
			| 'zone'
			| 'team'
		>
	>
	organs: Array<Pick<Organ, 'id' | 'name'>>
	departments: Array<Pick<Department, 'id' | 'name' | 'organId'>>
	locations: Array<Pick<Location, 'id' | 'name' | 'organId'>>
	floors: Array<Pick<Floor, 'id' | 'name' | 'locationId'>>
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
	const [selectedOrgan, setSelectedOrgan] = useState(profile?.organId || '')
	const [selectedLocation, setSelectedLocation] = useState(
		profile?.locationId || '',
	)
	const [filteredDepartments, setFilteredDepartments] = useState(departments)
	const [filteredLocations, setFilteredLocations] = useState(locations)
	const [filteredFloors, setFilteredFloors] = useState(floors)

	const [form, fields] = useForm({
		id: 'update-duty-station',
		constraint: getZodConstraint(DutyStationEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DutyStationEditorSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			...profile,
		},
	})

	useEffect(() => {
		if (selectedOrgan) {
			const newFilteredDepartments = departments.filter(
				department => department.organId === selectedOrgan,
			)
			const newFilteredLocations = locations.filter(
				location => location.organId === selectedOrgan,
			)
			setFilteredDepartments(newFilteredDepartments)
			setFilteredLocations(newFilteredLocations)

			// Reset selectedLocation if it's not in the new filtered locations
			if (
				!newFilteredLocations.some(location => location.id === selectedLocation)
			) {
				setSelectedLocation('')
			}
		} else {
			setFilteredDepartments(departments)
			setFilteredLocations(locations)
		}
	}, [selectedOrgan, departments, locations, selectedLocation])

	useEffect(() => {
		if (selectedLocation) {
			setFilteredFloors(
				floors.filter(floor => floor.locationId === selectedLocation),
			)
		} else {
			setFilteredFloors([])
		}
	}, [selectedLocation, floors])

	return (
		<Card className="mx-auto w-full max-w-5xl space-y-6 p-6">
			<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
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
					<AuthenticityTokenInput />
					<HoneypotInputs />
					<InputField meta={fields.id} type="hidden" />
					<div className="space-y-2">
						<Field>
							<Label htmlFor={fields.organId.id}>Organ</Label>
							<SelectField
								meta={fields.organId}
								items={organs.map(organ => ({
									name: organ.name,
									value: organ.id,
								}))}
								placeholder="Select an organ"
								onValueChange={value => setSelectedOrgan(value)}
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
								items={filteredDepartments.map(department => ({
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
									items={filteredLocations.map(location => ({
										name: location.name,
										value: location.id,
									}))}
									placeholder="Select a location"
									onValueChange={value => setSelectedLocation(value)}
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
									items={filteredFloors.map(floor => ({
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

				<CardFooter className="text-center space-x-4">
					<Button
						className="w-full"
						type="submit"
						name="intent"
						value="update-duty-station"
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
