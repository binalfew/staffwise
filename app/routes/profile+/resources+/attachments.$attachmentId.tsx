import { type LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { getFile } from '~/utils/storage.server'

export async function loader({ params }: LoaderFunctionArgs) {
	invariantResponse(params.attachmentId, 'Attachment ID is required', {
		status: 400,
	})
	const attachment = await prisma.attachment.findUnique({
		where: { id: params.attachmentId },
		select: {
			contentType: true,
			extension: true,
			fileName: true,
			incident: true,
		},
	})

	invariantResponse(attachment, 'Not found', { status: 404 })

	const blob = await getFile({
		containerName: 'incidents',
		fileName: `${attachment.incident.incidentNumber}/${attachment.fileName}.${attachment.extension}`,
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
