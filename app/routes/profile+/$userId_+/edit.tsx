import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useSearchParams } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'
import { AddressEditor } from './__address-editor'
import { DutyStationEditor } from './__duty-station-editor'
import { PersonalInfoEditor } from './__personal-info-editor'
import { ProfileEditor } from './__profile-editor'

export { action } from './__profile-editor.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)

	const countries = await prisma.country.findMany({
		select: { id: true, name: true },
	})

	const departments = await prisma.department.findMany({
		select: { id: true, name: true, organId: true },
	})

	const organs = await prisma.organ.findMany({
		select: { id: true, name: true },
	})

	const locations = await prisma.location.findMany({
		select: { id: true, name: true, organId: true },
	})

	const floors = await prisma.floor.findMany({
		select: { id: true, name: true, locationId: true },
	})

	const profile = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		select: {
			id: true,
			firstName: true,
			familyName: true,
			middleName: true,
			email: true,
			countryId: true,
			nationalPassportNumber: true,
			auPassportNumber: true,
			auIdNumber: true,
			dateIssued: true,
			validUntil: true,
			dateOfBirth: true,
			organId: true,
			departmentId: true,
			locationId: true,
			floorId: true,
			officeNumber: true,
			specialConditions: true,
			medicallyTrained: true,
			zone: true,
			team: true,
			city: true,
			subcity: true,
			woreda: true,
			street: true,
			kebele: true,
			houseNumber: true,
			houseTelephoneNumber: true,
			mobileTelephoneNumber: true,
			officeTelephoneNumber: true,
			specificLocation: true,
			gpsLocation: true,
			homeCountryAddress: true,
		},
	})

	invariantResponse(profile, 'Not Found', { status: 404 })

	return json({
		profile,
		countries,
		departments,
		organs,
		locations,
		floors,
	} as const)
}

export default function ProfileUpdateRoute() {
	const { profile, countries, organs, departments, locations, floors } =
		useLoaderData<typeof loader>()

	const [searchParams] = useSearchParams()
	const section = searchParams.get('section') || 'profile'
	const sections: { [key: string]: React.ComponentType<any> } = {
		personal: PersonalInfoEditor,
		profile: ProfileEditor,
		station: DutyStationEditor,
		address: AddressEditor,
	}

	const Editor = sections[section] || ProfileEditor

	return (
		<Editor
			profile={profile}
			countries={countries}
			organs={organs}
			departments={departments}
			locations={locations}
			floors={floors}
			mode="edit"
		/>
	)
}
