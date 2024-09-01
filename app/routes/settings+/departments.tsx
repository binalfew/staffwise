import { LoaderFunctionArgs } from '@remix-run/node'
import { Outlet, json, useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'
import { requireUserWithRole } from '~/utils/permission.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	return json({
		organs,
	})
}

export default function DepartmentsRoute() {
	const { organs } = useLoaderData<typeof loader>()

	return <Outlet context={{ organs }} />
}
