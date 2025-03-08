import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { format } from 'date-fns'
import { Card } from '~/components/ui/card'
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

	const personalInfo = {
		firstName: visitor.firstName,
		familyName: visitor.familyName,
		telephone: visitor.telephone,
		organization: visitor.organization,
	}

	const visitInfo = {
		whomToVisit: visitor.whomToVisit,
		destination: visitor.destination,
		carPlateNumber: visitor.carPlateNumber,
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open: boolean) => {
				open ? () => {} : handleClose()
			}}
		>
			<DialogContent className="sm:max-w-[725px]">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold">
						Visitor Details
					</DialogTitle>
				</DialogHeader>
				<div className="grid gap-6 py-4">
					<Card className="p-4">
						<h3 className="mb-4 text-lg font-semibold">Personal Information</h3>
						<div className="grid grid-cols-2 gap-4">
							{Object.entries(personalInfo).map(([key, value]) => (
								<div key={key} className="space-y-1">
									<label className="text-sm font-medium text-gray-500">
										{formatLabel(key)}
									</label>
									<p className="text-base">{value?.toString() || 'N/A'}</p>
								</div>
							))}
						</div>
					</Card>

					<Card className="p-4">
						<h3 className="mb-4 text-lg font-semibold">Visit Information</h3>
						<div className="grid grid-cols-2 gap-4">
							{Object.entries(visitInfo).map(([key, value]) => (
								<div key={key} className="space-y-1">
									<label className="text-sm font-medium text-gray-500">
										{formatLabel(key)}
									</label>
									<p className="text-base">{value?.toString() || 'N/A'}</p>
								</div>
							))}
						</div>
					</Card>

					<Card className="p-4">
						<h3 className="mb-4 text-lg font-semibold">Visit History</h3>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead className="bg-gray-50">
									<tr>
										<th className="border px-4 py-2 text-left font-medium text-gray-500">
											Badge
										</th>
										<th className="border px-4 py-2 text-left font-medium text-gray-500">
											Check In
										</th>
										<th className="border px-4 py-2 text-left font-medium text-gray-500">
											Check Out
										</th>
									</tr>
								</thead>
								<tbody>
									{visitor.logs.map((log: any) => (
										<tr key={log.id} className="hover:bg-gray-50">
											<td className="border px-4 py-2">{log.badgeNumber}</td>
											<td className="border px-4 py-2">
												{format(new Date(log.checkIn), 'PPpp')}
											</td>
											<td className="border px-4 py-2">
												{log.checkOut
													? format(new Date(log.checkOut), 'PPpp')
													: 'N/A'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function formatLabel(key: string): string {
	return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}
