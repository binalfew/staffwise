import { json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'

export async function loader() {
	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	const locations = await prisma.location.findMany({
		select: { id: true, name: true, organId: true },
	})

	return json({ organs, locations })
}

export default function FloorsRoute() {
	const { organs, locations } = useLoaderData<typeof loader>()
	return <Outlet context={{ organs, locations }} />
}
