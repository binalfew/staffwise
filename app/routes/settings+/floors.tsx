import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { requireUserId } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const organs = await prisma.organ.findMany({
		select: {
			id: true,
			name: true,
			locations: { select: { id: true, name: true } },
		},
	})

	return json({ organs })
}

export default function FloorsRoute() {
	const { organs } = useLoaderData<typeof loader>()
	return <Outlet context={{ organs }} />
}
