import { useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { Field, FieldError } from '~/components/Field'
import { CheckboxField } from '~/components/conform/CheckboxField'
import { InputField } from '~/components/conform/InputField'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'

const CountrySchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Name is required' }),
	code: z.string({ required_error: 'Code is required' }),
	isMemberState: z.boolean().optional().default(false),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const submission = parseWithZod(formData, { schema: CountrySchema })

	if (submission.status !== 'success') {
		return json(submission.reply())
	}

	const { id: countryId, name, code, isMemberState } = submission.value

	await prisma.country.upsert({
		select: { id: true },
		where: { id: countryId ?? '__new_country__' },
		create: {
			name,
			code,
			isMemberState,
		},
		update: {
			name,
			code,
			isMemberState,
		},
	})

	return redirect('/settings/countries')
}

export default function NewCountryRoute() {
	const lastResult = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'register-country',
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CountrySchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<div className="flex flex-col gap-8">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Add New Country</CardTitle>
					<CardDescription>
						Please fill out the form to register a new country.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form
						className="grid gap-4"
						method="POST"
						id={form.id}
						onSubmit={form.onSubmit}
					>
						<AuthenticityTokenInput />
						<HoneypotInputs />
						<Field>
							<Label htmlFor={fields.name.id}>Name</Label>
							<InputField meta={fields.name} type="text" autoComplete="off" />
							{fields.name.errors && (
								<FieldError>{fields.name.errors}</FieldError>
							)}
						</Field>

						<Field>
							<Label htmlFor={fields.code.id}>Code</Label>
							<InputField meta={fields.code} type="text" autoComplete="off" />
							{fields.code.errors && (
								<FieldError>{fields.code.errors}</FieldError>
							)}
						</Field>

						<Field>
							<div className="flex items-center gap-2">
								<CheckboxField meta={fields.isMemberState} />
								<Label htmlFor={fields.isMemberState.id}>Is Member State</Label>
							</div>
							{fields.isMemberState.errors && (
								<FieldError>{fields.isMemberState.errors}</FieldError>
							)}
						</Field>

						<div className="flex items-center justify-end space-x-2">
							<Button type="submit">Save</Button>
							<Button asChild variant="destructive">
								<Link to="/settings/countries">Cancel</Link>
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
