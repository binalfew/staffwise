import { parseWithZod } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
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
	IncidentDeleteSchema,
	IncidentEditorSchema,
} from './__incident-editor'

export async function action({ params, request }: ActionFunctionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	await validateCSRF(formData, request.headers)
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const submission = await parseWithZod(formData, {
			schema: IncidentDeleteSchema,
			async: true,
		})
		if (submission.status !== 'success') {
			return json(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}
		const incident = await prisma.incident.delete({
			where: { id: submission.value.id },
			select: { incidentNumber: true },
		})

		await deleteDirectory({
			containerName: 'incidents',
			directoryName: incident.incidentNumber,
		})

		return redirectWithToast(`/profile/${user.id}/incidents`, {
			type: 'success',
			title: `Incident Deleted`,
			description: `Incident deleted successfully.`,
		})
	}

	const submission = await parseWithZod(formData, {
		schema: IncidentEditorSchema.transform(
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

	invariantResponse(employee, 'Employee not found', {
		status: 404,
	})

	const {
		id: incidentId,
		updatedAttachments,
		newAttachments,
		...incidentDetails
	} = submission.value

	const data = {
		...incidentDetails,
		employeeId: employee.id,
	}

	const deletedAttachments = await prisma.attachment.findMany({
		select: { fileName: true, extension: true },
		where: { id: { notIn: updatedAttachments.map(i => i.id) } },
	})

	const incidentNumber = await generateSerialNumber('INCIDENT')
	const incident = await prisma.incident.upsert({
		select: { id: true, incidentNumber: true },
		where: { id: incidentId ?? '__new_incident__' },
		create: {
			...data,
			incidentNumber,
			attachments: {
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
		},
		update: {
			...data,
			attachments: {
				deleteMany: { id: { notIn: updatedAttachments.map(i => i.id) } },
				updateMany: updatedAttachments.map(({ blob, ...updates }) => ({
					where: { id: updates.id },
					data: { ...updates, id: blob ? cuid() : updates.id },
				})),
				create: newAttachments.map(({ blob, ...attachment }) => attachment),
			},
		},
	})

	const deletePromises = deletedAttachments.map(attachment =>
		deleteFileIfExists({
			containerName: 'incidents',
			prefix: incident.incidentNumber,
			fileName: attachment.fileName,
		}),
	)

	const updatePromises = updatedAttachments.map(attachment => {
		if (attachment.blob) {
			return uploadFile({
				containerName: 'incidents',
				directory: incident.incidentNumber,
				fileName: attachment.fileName,
				extension: attachment.extension,
				blob: attachment.blob,
			})
		}
		return Promise.resolve()
	})

	const newAttachmentsPromises = newAttachments.map(attachment =>
		uploadFile({
			containerName: 'incidents',
			directory: incident.incidentNumber,
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
		action: incidentId ? 'UPDATE' : 'CREATE',
		entity: 'Incident',
		details: {
			...data,
			id: incidentId,
		},
	})

	return redirectWithToast(`/profile/${user.id}/incidents`, {
		type: 'success',
		title: `Incident ${incidentId ? 'Updated' : 'Created'}`,
		description: `Incident ${incidentId ? 'updated' : 'created'} successfully.`,
	})
}
