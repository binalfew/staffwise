import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { format } from 'date-fns'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { prisma } from '~/utils/db.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { requireUserWithRoles } from '~/utils/permission.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'accessRequestAdmin'])

	const { visitorId } = params

	const visitor = await prisma.visitor.findUnique({
		where: { id: visitorId },
		select: {
			firstName: true,
			familyName: true,
			telephone: true,
			organization: true,
			whomToVisit: true,
			destination: true,
			carPlateNumber: true,
			logs: {
				select: {
					id: true,
					checkIn: true,
					checkOut: true,
					badgeNumber: true,
				},
			},
		},
	})

	invariantResponse(visitor, `Visitor with id ${visitorId} does not exist.`, {
		status: 404,
	})

	return json({ visitor })
}

export default function EditVisitorRoute() {
	const { visitor } = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	const handleClose = () => {
		navigate(-1)
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open: boolean) => {
				open ? () => {} : handleClose()
			}}
		>
			<DialogContent className="sm:max-w-[625px]">
				<DialogHeader>
					<DialogTitle>Visitor Details</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{Object.entries(visitor).map(([key, value]) => (
						<div key={key}>
							<span className="font-semibold">{formatLabel(key)}:</span>
							{Array.isArray(value) ? (
								<table className="mt-2 w-full text-sm">
									<thead>
										<tr>
											<th className="border px-2 py-1">Badge</th>
											<th className="border px-2 py-1">Check In</th>
											<th className="border px-2 py-1">Check Out</th>
										</tr>
									</thead>
									<tbody>
										{value.map((log: any) => (
											<tr key={log.id}>
												<td className="border px-2 py-1">{log.badgeNumber}</td>
												<td className="border px-2 py-1">
													{format(new Date(log.checkIn), 'PPpp')}
												</td>
												<td className="border px-2 py-1">
													{log.checkOut
														? format(new Date(log.checkOut), 'PPpp')
														: 'N/A'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<span>{value?.toString() || 'N/A'}</span>
							)}
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function formatLabel(key: string): string {
	return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}
