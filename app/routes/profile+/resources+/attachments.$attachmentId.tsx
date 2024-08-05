import { type LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { getFile } from '~/utils/storage.server'

type AttachmentType = 'car-pass-requests' | 'id-requests' | 'incidents'

export async function loader({ params }: LoaderFunctionArgs) {
	const { attachmentId } = params
	invariantResponse(attachmentId, 'Attachment ID is required', { status: 400 })

	const attachment = await prisma.attachment.findUnique({
		where: { id: attachmentId },
		select: {
			contentType: true,
			extension: true,
			fileName: true,
			incident: { select: { incidentNumber: true } },
			carPassRequest: { select: { requestNumber: true } },
			idRequest: { select: { requestNumber: true } },
			type: true,
		},
	})

	invariantResponse(attachment, 'Attachment not found', { status: 404 })

	const attachmentType = attachment.type as AttachmentType

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
			'cache-control': 'public, max-age=31536000, immutable',
		},
	})
}
