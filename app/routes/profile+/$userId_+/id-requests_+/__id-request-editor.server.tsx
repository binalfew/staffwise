import { parseWithZod } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import { IdRequestReason, IdRequestType } from '@prisma/client'
import { ActionFunctionArgs, json } from '@remix-run/node'
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
	IdRequestDeleteSchema,
	IdRequestEditorSchema,
} from './__id-request-editor'

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: IdRequestDeleteSchema,
			async: true,
		})

		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const idRequest = await prisma.idRequest.findFirst({
			where: { id: submission.value.id },
		})

		await prisma.idRequest.delete({
			where: { id: submission.value.id },
		})

		await deleteDirectory({
			containerName: 'id-requests',
			directoryName: idRequest?.requestNumber ?? '',
		})

		return redirectWithToast(`/profile/${user.id}/id-requests`, {
			type: 'success',
			title: 'ID Request Deleted',
			description: 'ID Request entry deleted successfully.',
		})
	}

	const submission = await parseWithZod(formData, {
		schema: IdRequestEditorSchema.transform(
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
									altText: `${image.file.name}.${extension}`,
									contentType: image.file.type,
									blob: Buffer.from(await image.file.arrayBuffer()),
									fileName: cuid(),
									extension,
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
		where: { email: user.email },
		select: { id: true, auIdNumber: true },
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	const {
		id: idRequestId,
		updatedAttachments,
		newAttachments,
		...idRequestDetails
	} = submission.value

	const deletedAttachments = await prisma.attachment.findMany({
		select: { fileName: true, extension: true },
		where: { id: { notIn: updatedAttachments.map(i => i.id) } },
	})

	const requestNumber = await generateSerialNumber('IDREQUEST')
	const idRequest = await prisma.idRequest.upsert({
		select: { id: true, requestNumber: true },
		where: { id: idRequestId ?? '__new_id_request__' },
		create: {
			...idRequestDetails,
			requestNumber,
			requestorEmail: user.email,
			type: idRequestDetails.type as IdRequestType,
			reason: idRequestDetails.reason as IdRequestReason,
			employeeIdRequest: idRequestDetails.employeeIdRequest
				? {
						create: {
							...idRequestDetails.employeeIdRequest,
							employee: {
								connect: { id: employee.id },
							},
						},
				  }
				: undefined,
			spouseIdRequest: idRequestDetails.spouseIdRequest
				? {
						create: idRequestDetails.spouseIdRequest,
				  }
				: undefined,
			dependantIdRequest: idRequestDetails.dependantIdRequest
				? {
						create: idRequestDetails.dependantIdRequest,
				  }
				: undefined,
			privateDriverIdRequest: idRequestDetails.privateDriverIdRequest
				? {
						create: {
							...idRequestDetails.privateDriverIdRequest,
							staffAuIdNumber: employee.auIdNumber,
						},
				  }
				: undefined,
			attachments: {
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
		},
		update: {
			type: idRequestDetails.type as IdRequestType,
			reason: idRequestDetails.reason as IdRequestReason,
			attachments: {
				deleteMany: { id: { notIn: updatedAttachments.map(i => i.id) } },
				updateMany: updatedAttachments.map(({ blob, ...updates }) => ({
					where: { id: updates.id },
					data: { ...updates, id: blob ? cuid() : updates.id },
				})),
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
			employeeIdRequest: idRequestDetails.employeeIdRequest
				? {
						upsert: {
							create: {
								...idRequestDetails.employeeIdRequest,
								employee: {
									connect: { id: employee.id },
								},
							},
							update: {
								...idRequestDetails.employeeIdRequest,
							},
						},
				  }
				: undefined,
			spouseIdRequest: idRequestDetails.spouseIdRequest
				? {
						upsert: {
							create: idRequestDetails.spouseIdRequest,
							update: idRequestDetails.spouseIdRequest,
						},
				  }
				: undefined,
			dependantIdRequest: idRequestDetails.dependantIdRequest
				? {
						upsert: {
							create: idRequestDetails.dependantIdRequest,
							update: idRequestDetails.dependantIdRequest,
						},
				  }
				: undefined,
			privateDriverIdRequest: idRequestDetails.privateDriverIdRequest
				? {
						upsert: {
							create: {
								...idRequestDetails.privateDriverIdRequest,
								staffAuIdNumber: employee.auIdNumber,
							},
							update: idRequestDetails.privateDriverIdRequest,
						},
				  }
				: undefined,
		},
	})

	const deletePromises = deletedAttachments.map(attachment =>
		deleteFileIfExists({
			containerName: 'id-requests',
			prefix: idRequest.requestNumber,
			fileName: attachment.fileName,
		}),
	)

	const updatePromises = updatedAttachments.map(attachment => {
		if (attachment.blob) {
			return uploadFile({
				containerName: 'id-requests',
				directory: idRequest.requestNumber,
				fileName: attachment.fileName,
				extension: attachment.extension,
				blob: attachment.blob,
			})
		}
		return Promise.resolve()
	})

	const newAttachmentsPromises = newAttachments.map(attachment =>
		uploadFile({
			containerName: 'id-requests',
			directory: idRequest.requestNumber,
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

	return redirectWithToast(`/profile/${user.id}/id-requests`, {
		type: 'success',
		title: `ID Request ${idRequestId ? 'Updated' : 'Created'}`,
		description: `ID Request ${
			idRequestId ? 'updated' : 'created'
		} successfully.`,
	})
}
