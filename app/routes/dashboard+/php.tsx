import { json, LoaderFunctionArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { filterAndPaginate, prisma } from '~/utils/db.server'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const { data, totalPages, currentPage } = await filterAndPaginate({
		request,
		model: prisma.employee,
		searchFields: ['auIdNumber', 'firstName', 'middleName'],
		orderBy: [{ firstName: 'asc' }],
		select: {
			id: true,
			firstName: true,
			middleName: true,
			familyName: true,
			auIdNumber: true,
		},
	})

	return json({
		status: 'idle',
		employees: data,
		totalPages,
		currentPage,
	} as const)
}

export default function PhpRoute() {
	const data = useLoaderData<typeof loader>()
	const { employees, totalPages, currentPage, status } = data

	return <Outlet />
}
