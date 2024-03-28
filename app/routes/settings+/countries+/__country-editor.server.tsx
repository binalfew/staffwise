import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { CountryDeleteSchema, CountryEditorSchema } from './__country-editor'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: CountryDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		await prisma.country.delete({
			where: { id: submission.value.id },
		})

		return redirectWithToast('/settings/countries', {
			type: 'success',
			title: `Country Deleted`,
			description: `Country deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: CountryEditorSchema.superRefine(async (data, ctx) => {
			const country = await prisma.country.findFirst({
				where: { name: data.name },
				select: { id: true },
			})

			if (country && country.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Country with this name already exists.',
				})
				return
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: countryId, name, code, isMemberState } = submission.value

	const data = {
		name,
		code,
		isMemberState,
	}

	await prisma.country.upsert({
		select: { id: true },
		where: { id: countryId ?? '__new_country__' },
		create: data,
		update: data,
	})

	return redirectWithToast('/settings/countries', {
		type: 'success',
		title: `Country ${countryId ? 'Updated' : 'Created'}`,
		description: `Country ${countryId ? 'updated' : 'created'} successfully.`,
	})
}
