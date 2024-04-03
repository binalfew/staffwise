import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { redirectWithToast } from '~/utils/toast.server'
import { ProfileEditorSchema } from './__profile-editor'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

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

	const {
		id: employeeId,
		firstName,
		familyName,
		middleName,
		email,
		countryId,
		nationalPassportNumber,
		auPassportNumber,
		auIdNumber,
		dateIssued,
		validUntil,
		dateOfBirth,
		organId,
		departmentId,
		locationId,
		floorId,
		officeNumber,
		specialConditions,
		medicallyTrained,
		zone,
		team,
		city,
		subcity,
		woreda,
		street,
		kebele,
		houseNumber,
		houseTelephoneNumber,
		mobileTelephoneNumber,
		officeTelephoneNumber,
		specificLocation,
		gpsLocation,
		homeCountryAddress,
	} = submission.value

	const data = {
		firstName,
		familyName,
		middleName,
		email,
		countryId,
		nationalPassportNumber,
		auPassportNumber,
		auIdNumber,
		dateIssued,
		validUntil,
		dateOfBirth,
		organId,
		departmentId,
		locationId,
		floorId,
		officeNumber,
		specialConditions,
		medicallyTrained,
		zone,
		team,
		city,
		subcity,
		woreda,
		street,
		kebele,
		houseNumber,
		houseTelephoneNumber,
		mobileTelephoneNumber,
		officeTelephoneNumber,
		specificLocation,
		gpsLocation,
		homeCountryAddress,
	}

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
