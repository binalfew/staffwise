import { type LoaderFunctionArgs } from '@remix-run/node'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { getFile } from '~/utils/storage.server'

type AttachmentType = 'car-pass-requests' | 'id-requests' | 'incidents'

const ADMIN_ROLES: Record<AttachmentType, string[]> = {
	incidents: ['admin', 'incidentAdmin'],
	'id-requests': ['admin', 'idRequestAdmin'],
	'car-pass-requests': ['admin', 'carPassAdmin'],
}

function sameEmail(a: string | undefined, b: string) {
	return a?.toLowerCase() === b.toLowerCase()
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	const { attachmentId } = params
	invariantResponse(attachmentId, 'Attachment ID is required', { status: 400 })

	const attachment = await prisma.attachment.findUnique({
		where: { id: attachmentId },
		select: {
			contentType: true,
			extension: true,
			fileName: true,
			incident: {
				select: { incidentNumber: true, employee: { select: { email: true } } },
			},
			carPassRequest: { select: { requestNumber: true, requestorEmail: true } },
			idRequest: { select: { requestNumber: true, requestorEmail: true } },
			type: true,
		},
	})

	invariantResponse(attachment, 'Attachment not found', { status: 404 })

	const attachmentType = attachment.type as AttachmentType
	invariantResponse(attachmentType in ADMIN_ROLES, 'Attachment not found', {
		status: 404,
	})

	const ownerEmail = {
		incidents: attachment.incident?.employee.email,
		'id-requests': attachment.idRequest?.requestorEmail,
		'car-pass-requests': attachment.carPassRequest?.requestorEmail,
	}[attachmentType]

	if (!sameEmail(ownerEmail, user.email)) {
		const isAdmin = await prisma.user.count({
			where: {
				id: user.id,
				roles: { some: { name: { in: ADMIN_ROLES[attachmentType] } } },
			},
		})
		// 404 rather than 403, so attachment IDs can't be probed.
		invariantResponse(isAdmin, 'Attachment not found', { status: 404 })
	}

	const requestNumber = (() => {
		switch (attachmentType) {
			case 'car-pass-requests':
				return attachment.carPassRequest?.requestNumber ?? ''
			case 'id-requests':
				return attachment.idRequest?.requestNumber ?? ''
			case 'incidents':
				return attachment.incident?.incidentNumber ?? ''
			default:
				return ''
		}
	})()

	const blob = await getFile({
		containerName: attachmentType,
		fileName: `${requestNumber}/${attachment.fileName}.${attachment.extension}`,
	})

	return new Response(blob, {
		headers: {
			'content-type': attachment.contentType,
			'content-length': Buffer.byteLength(blob).toString(),
			'content-disposition': `inline; filename="${params.attachmentId}"`,
			'cache-control': 'private, no-store',
		},
	})
}
