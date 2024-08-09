import { parseWithZod } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import { CarPassRequestReason, CarPassRequestType } from '@prisma/client'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { insertAuditLog } from '~/utils/audit.server'
import { requireUser } from '~/utils/auth.server'
import { validateCSRF } from '~/utils/csrf.server'
import { generateSerialNumber, prisma } from '~/utils/db.server'
import { checkHoneypot } from '~/utils/honeypot.server'
import { invariantResponse } from '~/utils/misc'
import {
	deleteDirectory,
	deleteFileIfExists,
	uploadFile,
} from '~/utils/storage.server'
import { redirectWithToast } from '~/utils/toast.server'
import {
	attachmentHasFile,
	attachmentHasId,
	CarPassRequestDeleteSchema,
	CarPassRequestEditorSchema,
} from './__car-pass-request-editor'

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: CarPassRequestDeleteSchema,
			async: true,
		})

		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const carPassRequest = await prisma.carPassRequest.findFirst({
			where: { id: submission.value.id },
		})

		await prisma.carPassRequest.delete({
			where: { id: submission.value.id },
		})

		await deleteDirectory({
			containerName: 'car-pass-requests',
			directoryName: carPassRequest?.requestNumber ?? '',
		})

		return redirectWithToast(`/profile/${user.id}/car-pass-requests`, {
			type: 'success',
			title: 'Car Pass Request Deleted',
			description: 'Car Pass Request entry deleted successfully.',
		})
	}

	const submission = await parseWithZod(formData, {
		schema: CarPassRequestEditorSchema.transform(
			async ({ attachments = [], ...data }) => {
				return {
					...data,
					updatedAttachments: await Promise.all(
						attachments.filter(attachmentHasId).map(async i => {
							const attachment = await prisma.attachment.findUnique({
								where: { id: i.id },
							})

							if (attachmentHasFile(i)) {
								return {
									id: i.id,
									altText: i.altText,
									contentType: i.file.type,
									blob: Buffer.from(await i.file.arrayBuffer()),
									fileName: attachment?.fileName ?? cuid(),
									extension: i.file.name.split('.').pop() ?? '',
								}
							} else {
								return { id: i.id }
							}
						}),
					),
					newAttachments: await Promise.all(
						attachments
							.filter(attachmentHasFile)
							.filter(image => !image.id)
							.map(async image => {
								const extension = image.file.name.split('.').pop() ?? ''
								return {
									altText: `${image.file.name}`,
									contentType: image.file.type,
									blob: Buffer.from(await image.file.arrayBuffer()),
									fileName: cuid(),
									extension,
									type: 'car-pass-requests',
								}
							}),
					),
				}
			},
		),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		select: { id: true, auIdNumber: true },
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	const {
		id: carPassRequestId,
		updatedAttachments,
		newAttachments,
		...carPassRequestDetails
	} = submission.value

	const deletedAttachments = await prisma.attachment.findMany({
		select: { fileName: true, extension: true },
		where: { id: { notIn: updatedAttachments.map(i => i.id) } },
	})

	const requestNumber = await generateSerialNumber('CARPASSREQUEST')
	const carPassRequest = await prisma.carPassRequest.upsert({
		select: { id: true, requestNumber: true },
		where: { id: carPassRequestId ?? '__new_car_pass_request__' },
		create: {
			...carPassRequestDetails,
			requestNumber,
			requestorEmail: user.email,
			type: carPassRequestDetails.type as CarPassRequestType,
			reason: carPassRequestDetails.reason as CarPassRequestReason,
			employeeCarPassRequest: carPassRequestDetails.employeeCarPassRequest
				? {
						create: carPassRequestDetails.employeeCarPassRequest,
				  }
				: undefined,
			attachments: {
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
		},
		update: {
			type: carPassRequestDetails.type as CarPassRequestType,
			reason: carPassRequestDetails.reason as CarPassRequestReason,
			attachments: {
				deleteMany: { id: { notIn: updatedAttachments.map(i => i.id) } },
				updateMany: updatedAttachments.map(({ blob, ...updates }) => ({
					where: { id: updates.id },
					data: { ...updates, id: blob ? cuid() : updates.id },
				})),
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
			employeeCarPassRequest: carPassRequestDetails.employeeCarPassRequest
				? {
						upsert: {
							create: carPassRequestDetails.employeeCarPassRequest,
							update: carPassRequestDetails.employeeCarPassRequest,
						},
				  }
				: undefined,
		},
	})

	const deletePromises = deletedAttachments.map(attachment =>
		deleteFileIfExists({
			containerName: 'car-pass-requests',
			prefix: carPassRequest.requestNumber,
			fileName: attachment.fileName,
		}),
	)

	const updatePromises = updatedAttachments.map(attachment => {
		if (attachment.blob) {
			return uploadFile({
				containerName: 'car-pass-requests',
				directory: carPassRequest.requestNumber,
				fileName: attachment.fileName,
				extension: attachment.extension,
				blob: attachment.blob,
			})
		}
		return Promise.resolve()
	})

	const newAttachmentsPromises = newAttachments.map(attachment =>
		uploadFile({
			containerName: 'car-pass-requests',
			directory: carPassRequest.requestNumber,
			fileName: attachment.fileName,
			extension: attachment.extension,
			blob: attachment.blob,
		}),
	)

	await Promise.all([
		...deletePromises,
		...updatePromises,
		...newAttachmentsPromises,
	])

	await insertAuditLog({
		user: { id: user.id },
		action: carPassRequestId ? 'UPDATE' : 'CREATE',
		entity: 'Car Pass Request',
		details: {
			...carPassRequestDetails,
			id: carPassRequestId,
		},
	})

	return redirectWithToast(`/profile/${user.id}/car-pass-requests`, {
		type: 'success',
		title: `Car Pass Request ${carPassRequestId ? 'Updated' : 'Created'}`,
		description: `Car Pass Request ${
			carPassRequestId ? 'updated' : 'created'
		} successfully.`,
	})
}
