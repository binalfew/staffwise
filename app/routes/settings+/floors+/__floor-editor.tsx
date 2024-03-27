import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint } from '@conform-to/zod'
import { Floor, Location, Organ } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Form, Link, useActionData, useOutletContext } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
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
import { action } from './__floor-editor.server'

export const FloorDeleteSchema = z.object({
	id: z.string(),
})

export type OutletContext = {
	organs: SerializeFrom<Pick<Organ, 'id' | 'name'>[]>
	locations: SerializeFrom<Pick<Location, 'id' | 'name' | 'organId'>[]>
}

export const FloorEditorSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	code: z.string({ required_error: 'Code is required' }),
	organId: z.string({ required_error: 'Organ is required' }),
	locationId: z.string({ required_error: 'Location is required' }),
})

type LocationType = Pick<Location, 'id' | 'name' | 'organId'>

export function FloorEditor({
	floor,
	title,
	intent,
}: {
	floor?: SerializeFrom<Pick<Floor, 'id' | 'name' | 'code' | 'locationId'>>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const { organs, locations } = useOutletContext<OutletContext>()
	const actionData = useActionData<typeof action>()
	const disabled = intent === 'delete'
	const [form, fields] = useForm({
		id: 'register-floor',
		constraint: getZodConstraint(FloorEditorSchema),
		lastResult: actionData?.result,
		defaultValue: {
			...floor,
			organId: floor?.locationId
				? locations.find(location => location.id === floor.locationId)?.organId
				: undefined,
		},
	})

	const [selectedOrganId, setSelectedOrganId] = useState(
		floor?.locationId
			? locations.find(location => location.id === floor.locationId)?.organId
			: undefined,
	)
	const [filteredLocations, setFilteredLocations] = useState<LocationType[]>([])

	useEffect(() => {
		const filtered = locations.filter(
			location => location.organId === selectedOrganId,
		)
		setFilteredLocations(filtered)
	}, [selectedOrganId, locations])

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500">
							Are you sure you want to delete this floor? This action cannot be
							undone.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />
						<Field>
							<Label htmlFor={fields.organId.id}>Organ</Label>
							<SelectField
								meta={fields.organId}
								items={organs.map(organ => ({
									name: organ.name,
									value: organ.id,
								}))}
								disabled={disabled}
								placeholder="Select an organ"
								onValueChange={value => {
									setSelectedOrganId(value)
								}}
							/>
							{fields.organId.errors && (
								<FieldError>{fields.organId.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label htmlFor={fields.locationId.id}>Location</Label>
							<SelectField
								meta={fields.locationId}
								items={filteredLocations.map(location => ({
									name: location.name,
									value: location.id,
								}))}
								disabled={disabled}
								placeholder="Select a location"
							/>
							{fields.locationId.errors && (
								<FieldError>{fields.locationId.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.name.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Name
							</Label>
							<InputField
								meta={fields.name}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.name.errors && (
								<FieldError>{fields.name.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.code.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Code
							</Label>
							<InputField
								meta={fields.code}
								type="text"
								autoComplete="off"
								disabled={disabled}
							/>
							{fields.code.errors && (
								<FieldError>{fields.code.errors}</FieldError>
							)}
						</Field>
					</Form>
				</CardContent>
				<CardFooter>
					<div className="flex items-center justify-end space-x-2">
						<Button
							type="submit"
							form={form.id}
							name="intent"
							value={intent}
							variant={intent === 'delete' ? 'destructive' : 'default'}
						>
							{intent === 'delete' ? 'Delete' : 'Save'}
						</Button>
						<Button asChild variant="outline">
							<Link to="/settings/floors">Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
