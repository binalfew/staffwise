import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { ProfileEditor } from './__profile-editor'
export { action } from './__profile-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUser(request)

	const countries = await prisma.country.findMany({
		select: { id: true, name: true },
	})
	const departments = await prisma.department.findMany({
		select: { id: true, name: true, organId: true },
	})
	const organs = await prisma.organ.findMany({
		select: {
			id: true,
			name: true,
			departments: { select: { id: true } },
			locations: { select: { id: true } },
		},
	})
	const locations = await prisma.location.findMany({
		select: { id: true, name: true, organId: true },
	})
	const floors = await prisma.floor.findMany({
		select: { id: true, name: true, locationId: true },
	})

	return json({
		countries,
		departments,
		organs,
		locations,
		floors,
	} as const)
}

export default function ProfileUpdateRoute() {
	const { countries, organs, departments, locations, floors } =
		useLoaderData<typeof loader>()

	return (
		<ProfileEditor
			countries={countries}
			organs={organs}
			departments={departments}
			locations={locations}
			floors={floors}
		/>
	)
}
