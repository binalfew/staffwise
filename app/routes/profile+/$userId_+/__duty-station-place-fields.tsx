import { type FieldMetadata } from '@conform-to/react'
import { Department, Floor, Location } from '@prisma/client'
import { useState } from 'react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Label } from '~/components/ui/label'

// Regional offices often have no Location/Floor rows configured, so the
// building and floor can be typed instead of picked. An empty input saves
// NULL so switching between the select and the text input clears the other.
const optionalText = z
	.string()
	.optional()
	.transform(value => value ?? null)

export const dutyStationPlaceSchema = {
	locationId: optionalText,
	buildingName: optionalText,
	floorId: optionalText,
	floorName: optionalText,
}

type DutyStationPlace = {
	locationId: string | null
	buildingName: string | null
	floorId: string | null
	floorName: string | null
}

// Each issue is added to both paths because the client doesn't know which of
// the two inputs is on screen; only the rendered one shows its error.
export function refineDutyStationPlace(
	data: DutyStationPlace,
	ctx: z.RefinementCtx,
) {
	if (!data.locationId && !data.buildingName) {
		for (const path of ['locationId', 'buildingName']) {
			ctx.addIssue({
				path: [path],
				code: z.ZodIssueCode.custom,
				message: 'Building is required',
			})
		}
	}
	if (!data.floorId && !data.floorName) {
		for (const path of ['floorId', 'floorName']) {
			ctx.addIssue({
				path: [path],
				code: z.ZodIssueCode.custom,
				message: 'Floor is required',
			})
		}
	}
}

// Most regional offices have no departments of their own yet; their staff
// belong to an HQ parent department, so offer every department instead.
export function DepartmentField({
	organId,
	departments,
	meta,
}: {
	organId: string
	departments: Array<Pick<Department, 'id' | 'name' | 'organId'>>
	meta: FieldMetadata<string>
}) {
	const organDepartments = departments.filter(
		department => department.organId === organId,
	)
	const showAll = !organId || organDepartments.length === 0
	const items = showAll ? departments : organDepartments

	return (
		<Field>
			<Label htmlFor={meta.id}>Department</Label>
			<SelectField
				key={organId}
				meta={meta}
				items={items.map(department => ({
					name: department.name,
					value: department.id,
				}))}
				placeholder="Select a department"
			/>
			{organId && organDepartments.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No departments are set up for this organ yet. Choose your parent
					department.
				</p>
			) : null}
			{meta.errors && <FieldError>{meta.errors}</FieldError>}
		</Field>
	)
}

export function DutyStationPlaceFields({
	organId,
	locations,
	floors,
	fields,
}: {
	organId: string
	locations: Array<Pick<Location, 'id' | 'name' | 'organId'>>
	floors: Array<Pick<Floor, 'id' | 'name' | 'locationId'>>
	fields: {
		locationId: FieldMetadata<string>
		buildingName: FieldMetadata<string>
		floorId: FieldMetadata<string>
		floorName: FieldMetadata<string>
		officeNumber: FieldMetadata<string>
	}
}) {
	const initialLocation = fields.locationId.initialValue ?? ''
	const [selectedLocation, setSelectedLocation] = useState(initialLocation)
	const [renderedOrgan, setRenderedOrgan] = useState(organId)
	if (organId !== renderedOrgan) {
		// The location select remounts with its initial value, so track that.
		setRenderedOrgan(organId)
		setSelectedLocation(initialLocation)
	}

	const organLocations = locations.filter(
		location => location.organId === organId,
	)
	const typeBuilding = Boolean(organId) && organLocations.length === 0
	const locationSelected = organLocations.some(
		location => location.id === selectedLocation,
	)
	const locationFloors = locationSelected
		? floors.filter(floor => floor.locationId === selectedLocation)
		: []
	const typeFloor =
		typeBuilding || (locationSelected && locationFloors.length === 0)

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-3 gap-4">
				<div className="space-y-2">
					{typeBuilding ? (
						<Field>
							<Label htmlFor={fields.buildingName.id}>Building</Label>
							<InputField
								meta={fields.buildingName}
								type="text"
								autoComplete="off"
								placeholder="Building name"
							/>
							{fields.buildingName.errors && (
								<FieldError>{fields.buildingName.errors}</FieldError>
							)}
						</Field>
					) : (
						<Field>
							<Label htmlFor={fields.locationId.id}>Location</Label>
							<SelectField
								// Remount on organ change so a location from the previous
								// organ isn't kept or submitted.
								key={organId}
								meta={fields.locationId}
								items={organLocations.map(location => ({
									name: location.name,
									value: location.id,
								}))}
								placeholder={
									organId ? 'Select a location' : 'Select an organ first'
								}
								onValueChange={value => setSelectedLocation(value)}
							/>
							{fields.locationId.errors && (
								<FieldError>{fields.locationId.errors}</FieldError>
							)}
						</Field>
					)}
				</div>
				<div className="space-y-2">
					{typeFloor ? (
						<Field>
							<Label htmlFor={fields.floorName.id}>Floor</Label>
							<InputField
								meta={fields.floorName}
								type="text"
								autoComplete="off"
								placeholder="e.g. Ground floor"
							/>
							{fields.floorName.errors && (
								<FieldError>{fields.floorName.errors}</FieldError>
							)}
						</Field>
					) : (
						<Field>
							<Label htmlFor={fields.floorId.id}>Floor</Label>
							<SelectField
								key={`${organId}-${selectedLocation}`}
								meta={fields.floorId}
								items={locationFloors.map(floor => ({
									name: floor.name,
									value: floor.id,
								}))}
								placeholder={
									locationSelected
										? 'Select a floor'
										: 'Select a location first'
								}
							/>
							{fields.floorId.errors && (
								<FieldError>{fields.floorId.errors}</FieldError>
							)}
						</Field>
					)}
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
			{typeBuilding ? (
				<p className="text-sm text-muted-foreground">
					No buildings are set up for this organ yet. Type the building and
					floor instead.
				</p>
			) : null}
		</div>
	)
}
