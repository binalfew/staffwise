import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Vehicle } from '@prisma/client'
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
import { Separator } from '~/components/ui/separator'
import { type action } from './__vehicle-editor.server'

export const VehicleEditorSchema = z.object({
	id: z.string().optional(),
	make: z.string({ required_error: 'Make is required' }),
	model: z.string({ required_error: 'Model is required' }),
	year: z.string({ required_error: 'Year is required' }),
	color: z.string({ required_error: 'Color is required' }),
	plateNumber: z.string({ required_error: 'Plate Number is required' }),
	capacity: z.string({ required_error: 'Capacity is required' }),
})

export const VehicleDeleteSchema = z.object({
	id: z.string(),
})

export function VehicleEditor({
	vehicle,
	title,
	intent,
}: {
	vehicle?: SerializeFrom<
		Pick<
			Vehicle,
			'id' | 'make' | 'model' | 'year' | 'color' | 'plateNumber' | 'capacity'
		>
	>
	title: string
	intent?: 'add' | 'edit' | 'delete'
}) {
	const params = useParams()
	const actionData = useActionData<typeof action>()
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

	return (
		<div className="flex flex-col gap-8">
			<Card className="mx-auto w-full max-w-5xl space-y-6 py-2">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					{intent === 'delete' && (
						<CardDescription className="text-red-500 py-2">
							Are you sure you want to delete this vehicle? This action cannot
							be undone.
						</CardDescription>
					)}
				</CardHeader>
				<Separator className="mb-1" />
				<CardContent>
					<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<InputField meta={fields.id} type="hidden" />
						<Field>
							<Label
								htmlFor={fields.make.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Make
							</Label>
							<InputField meta={fields.make} disabled={disabled} type="text" />
							{fields.make.errors && (
								<FieldError>{fields.make.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.model.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Model
							</Label>
							<InputField meta={fields.model} disabled={disabled} type="text" />
							{fields.model.errors && (
								<FieldError>{fields.model.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.year.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Year
							</Label>
							<InputField meta={fields.year} disabled={disabled} type="text" />
							{fields.year.errors && (
								<FieldError>{fields.year.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.color.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Color
							</Label>
							<InputField meta={fields.color} disabled={disabled} type="text" />
							{fields.color.errors && (
								<FieldError>{fields.color.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.plateNumber.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Plate Number
							</Label>
							<InputField
								meta={fields.plateNumber}
								disabled={disabled}
								type="text"
							/>
							{fields.plateNumber.errors && (
								<FieldError>{fields.plateNumber.errors}</FieldError>
							)}
						</Field>
						<Field>
							<Label
								htmlFor={fields.capacity.id}
								className={disabled ? 'text-muted-foreground' : ''}
							>
								Capacity
							</Label>
							<InputField
								meta={fields.capacity}
								disabled={disabled}
								type="text"
							/>
							{fields.capacity.errors && (
								<FieldError>{fields.capacity.errors}</FieldError>
							)}
						</Field>
					</Form>
				</CardContent>
				<CardFooter className="border-t px-6 py-4">
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
							<Link to={`/profile/${params.userId}/vehicles`}>Cancel</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
