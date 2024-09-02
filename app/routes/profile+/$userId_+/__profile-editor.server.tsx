import { parseWithZod } from '@conform-to/zod'
import { User } from '@prisma/client'
import { ActionFunctionArgs, json, SerializeFrom } from '@remix-run/node'
import { z } from 'zod'
import { insertAuditLog } from '~/utils/audit.server'
import { requireUserId } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
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

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true },
	})

	invariantResponse(user !== null, 'User not found', {
		status: 404,
	})

	switch (intent) {
		case 'update-profile':
			return updateProfile({ user, formData })
		case 'update-personal-info':
			return updatePersonalInfo({ user, formData })
		case 'update-duty-station':
			return updateDutyStation({ user, formData })
		case 'update-address':
			return updateAddress({ user, formData })
		default:
			return redirectWithToast(`/profile/${userId}`, {
				type: 'error',
				title: 'Invalid Intent',
				description: 'Invalid intent.',
			})
	}
}

async function updateProfile({
	user,
	formData,
}: {
	user: SerializeFrom<Pick<User, 'id' | 'email'>>
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: ProfileEditorSchema.superRefine(async (data, ctx) => {
			const employee = await prisma.employee.findFirst({
				where: {
					email: {
						equals: user.email,
						mode: 'insensitive',
					},
				},
				select: { id: true },
			})

			if (employee && employee.id !== data.id) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'Profile with this email already exists.',
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
		create: {
			...data,
			email: user.email,
		},
		update: {
			...data,
			email: user.email,
		},
	})

	await insertAuditLog({
		user: { id: user.id },
		action: 'UPDATE',
		entity: 'Employee',
		details: {
			...data,
			id: employeeId,
			email: user.email,
		},
	})

	return redirectWithToast(`/profile/${user.id}`, {
		type: 'success',
		title: 'Profile Updated',
		description: 'Profile updated successfully.',
	})
}

async function updatePersonalInfo({
	user,
	formData,
}: {
	user: SerializeFrom<Pick<User, 'id' | 'email'>>
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: PersonalInfoEditorSchema,
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
		data: {
			...data,
			profileStatus: 'PENDING',
		},
	})

	await insertAuditLog({
		user: { id: user.id },
		action: 'UPDATE',
		entity: 'Employee',
		details: {
			...data,
			id: employeeId,
		},
	})

	return redirectWithToast(`/profile/${user.id}`, {
		type: 'success',
		title: 'Personal Info Updated',
		description: 'Personal info updated successfully.',
	})
}

async function updateDutyStation({
	user,
	formData,
}: {
	user: SerializeFrom<Pick<User, 'id' | 'email'>>
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

	await insertAuditLog({
		user: { id: user.id },
		action: 'UPDATE',
		entity: 'Employee',
		details: {
			...data,
			id: employeeId,
		},
	})

	return redirectWithToast(`/profile/${user.id}`, {
		type: 'success',
		title: 'Duty Station Updated',
		description: 'Duty station updated successfully.',
	})
}

async function updateAddress({
	user,
	formData,
}: {
	user: SerializeFrom<Pick<User, 'id' | 'email'>>
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

	await insertAuditLog({
		user: { id: user.id },
		action: 'UPDATE',
		entity: 'Employee',
		details: {
			...data,
			id: employeeId,
		},
	})

	return redirectWithToast(`/profile/${user.id}`, {
		type: 'success',
		title: 'Address Updated',
		description: 'Address updated successfully.',
	})
}
