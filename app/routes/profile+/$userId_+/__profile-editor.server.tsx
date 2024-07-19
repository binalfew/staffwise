import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { AddressEditorSchema } from './__address-editor'
import { DutyStationEditorSchema } from './__duty-station-editor'
import { PersonalInfoEditorSchema } from './__personal-info-editor'
import { ProfileEditorSchema } from './__profile-editor'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	switch (intent) {
		case 'update-profile':
			return updateProfile({ userId, formData })
		case 'update-personal-info':
			return updatePersonalInfo({ userId, formData })
		case 'update-duty-station':
			return updateDutyStation({ userId, formData })
		case 'update-address':
			return updateAddress({ userId, formData })
		default:
			return redirectWithToast(`/profile/${userId}`, {
				type: 'error',
				title: 'Invalid Intent',
				description: 'Invalid intent.',
			})
	}
}

async function updateProfile({
	userId,
	formData,
}: {
	userId: string
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: ProfileEditorSchema.superRefine(async (data, ctx) => {
			const employee = await prisma.employee.findFirst({
				where: { email: data.email },
				select: { id: true },
			})

			if (employee && employee.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Profile with this name already exists.',
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

	const { id: employeeId, ...data } = submission.value

	await prisma.employee.upsert({
		select: { id: true },
		where: { id: employeeId ?? '__new_employee__' },
		create: data,
		update: data,
	})

	return redirectWithToast(`/profile/${userId}`, {
		type: 'success',
		title: 'Profile Updated',
		description: 'Profile updated successfully.',
	})
}

async function updatePersonalInfo({
	userId,
	formData,
}: {
	userId: string
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: PersonalInfoEditorSchema.superRefine(async (data, ctx) => {
			const employee = await prisma.employee.findFirst({
				where: { email: data.email },
				select: { id: true },
			})

			if (employee && employee.id !== data.id) {
				ctx.addIssue({
					path: ['name'],
					code: z.ZodIssueCode.custom,
					message: 'Profile with this name already exists.',
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

	const { id: employeeId, ...data } = submission.value

	await prisma.employee.update({
		where: { id: employeeId },
		data,
	})

	return redirectWithToast(`/profile/${userId}`, {
		type: 'success',
		title: 'Personal Info Updated',
		description: 'Personal info updated successfully.',
	})
}

async function updateDutyStation({
	userId,
	formData,
}: {
	userId: string
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: DutyStationEditorSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: employeeId, ...data } = submission.value

	await prisma.employee.update({
		where: { id: employeeId },
		data,
	})

	return redirectWithToast(`/profile/${userId}`, {
		type: 'success',
		title: 'Duty Station Updated',
		description: 'Duty station updated successfully.',
	})
}

async function updateAddress({
	userId,
	formData,
}: {
	userId: string
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: AddressEditorSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: employeeId, ...data } = submission.value

	await prisma.employee.update({
		where: { id: employeeId },
		data,
	})

	return redirectWithToast(`/profile/${userId}`, {
		type: 'success',
		title: 'Address Updated',
		description: 'Address updated successfully.',
	})
}
