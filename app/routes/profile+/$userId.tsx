import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { IdCardIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, json, useLoaderData } from '@remix-run/react'
import {
	CarIcon,
	CreditCardIcon,
	EditIcon,
	UserIcon,
	UsersIcon,
} from 'lucide-react'
import { FC } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { requireUser } from '~/utils/auth.server'
import { prisma } from '~/utils/db.server'
import { formatDate, invariantResponse } from '~/utils/misc'
import { redirectWithToast } from '~/utils/toast.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user.id === params.userId, 'Not authorized', {
		status: 403,
	})

	const employee = await prisma.employee.findFirst({
		where: {
			email: {
				equals: user.email,
				mode: 'insensitive',
			},
		},
		include: {
			country: true,
			location: true,
			floor: true,
			department: { include: { organ: true } },
			spouses: true,
			dependants: true,
			vehicles: true,
			incidents: true,
			accessRequests: true,
		},
	})

	if (!employee) {
		throw await redirectWithToast(`/profile/${user.id}/new`, {
			type: 'message',
			title: 'Update your profile',
			description: `You have not created your profile yet. Please update your personal information.`,
		})
	}

	const carPassRequests = await prisma.carPassRequest.findMany({
		where: {
			requestorEmail: employee.email.toLowerCase(),
		},
	})

	const idRequests = await prisma.idRequest.findMany({
		where: {
			requestorEmail: employee.email.toLowerCase(),
		},
	})

	return json({ user, employee, idRequests, carPassRequests })
}

export default function ProfileRoute() {
	const { user, employee, idRequests, carPassRequests } =
		useLoaderData<typeof loader>()

	if (!employee) {
		return (
			<div className="text-center">
				<UserIcon className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-semibold text-gray-900">
					You have not created your profile yet
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Get started by updating your personal information.
				</p>
				<div className="mt-6">
					<Button asChild size="sm" className="ml-auto gap-1">
						<Link to={`/profile/${user.id}/${employee ? 'edit' : 'new'}`}>
							<EditIcon className="h-4 w-4" />
							Update
						</Link>
					</Button>
				</div>
			</div>
		)
	}

	type ProfileSectionProps = {
		title: string
		url: string
		children: React.ReactNode
	}

	const ProfileSection: FC<ProfileSectionProps> = ({
		title,
		url,
		children,
	}) => (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						{title}
					</CardTitle>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<Link to={url}>
						<EditIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
					</Link>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">{children}</CardContent>
		</Card>
	)

	type ProfileItemProps = {
		label: string
		value: string | number | null | undefined
		isDate?: boolean
	}

	const ProfileItem: FC<ProfileItemProps> = ({ label, value, isDate }) => (
		<div className="space-y-2">
			<Label
				htmlFor={label}
				className="block text-sm font-medium text-gray-700"
			>
				{label}
			</Label>
			<div className="mt-1">
				<Input
					readOnly
					id={label}
					value={
						isDate && typeof value === 'string'
							? formatDate(value)
							: typeof value === 'string' || typeof value === 'number'
							? String(value)
							: ''
					}
					className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
				/>
			</div>
		</div>
	)

	const renderCards = () => (
		<div className="grid gap-4 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
			{[
				{
					title: 'Spouses',
					icon: UsersIcon,
					count: employee.spouses.length,
					link: 'spouses',
					color: 'bg-blue-100 text-blue-800',
				},
				{
					title: 'Dependants',
					icon: UsersIcon,
					count: employee.dependants.length,
					link: 'dependants',
					color: 'bg-green-100 text-green-800',
				},
				{
					title: 'Vehicles',
					icon: CarIcon,
					count: employee.vehicles.length,
					link: 'vehicles',
					color: 'bg-yellow-100 text-yellow-800',
				},
				{
					title: 'Incidents',
					icon: CreditCardIcon,
					count: employee.incidents.length,
					link: 'incidents',
					color: 'bg-red-100 text-red-800',
				},
				{
					title: 'Access Requests',
					icon: LockClosedIcon,
					count: employee.accessRequests.length,
					link: 'access-requests',
					color: 'bg-purple-100 text-purple-800',
				},
				{
					title: 'Parking Reservations',
					icon: CarIcon,
					count: 0,
					link: 'parking',
					color: 'bg-blue-100 text-indigo-800',
				},
				{
					title: 'Car Passes',
					icon: CarIcon,
					count: carPassRequests.length,
					link: 'car-pass-requests',
					color: 'bg-red-100 text-indigo-8000',
				},
				{
					title: 'ID Requests',
					icon: IdCardIcon,
					count: idRequests.length,
					link: 'id-requests',
					color: 'bg-green-100 text-indigo-800',
				},
			].map((item, idx) => (
				<Link key={idx} to={`/profile/${user.id}/${item.link}`}>
					<Card className={`border ${item.color}`}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{item.title}
							</CardTitle>
							<item.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{item.count}</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	)

	return (
		<div className="grid gap-6">
			{employee.profileStatus === 'APPROVED' ? (
				renderCards()
			) : employee.profileStatus === 'PENDING' ? (
				<div className="rounded-md bg-green-100 p-6 border border-green-400">
					<div className="flex">
						<div className="flex-shrink-0">
							<InformationCircleIcon
								aria-hidden="true"
								className="h-6 w-6 text-green-600"
							/>
						</div>
						<div className="ml-4 flex-1 md:flex md:justify-between">
							<p className="text-base font-semibold text-green-800">
								Your profile is under review. You will be notified when it is
								approved.
							</p>
						</div>
					</div>
				</div>
			) : employee.profileStatus === 'REJECTED' ? (
				<div className="rounded-md bg-red-100 p-6 border border-red-400">
					<div className="flex">
						<div className="flex-shrink-0">
							<InformationCircleIcon
								aria-hidden="true"
								className="h-6 w-6 text-red-600"
							/>
						</div>
						<div className="ml-4 flex-1">
							<p className="text-base font-semibold text-red-800">
								Your profile is rejected.
							</p>
							<p className="mt-2 text-sm text-red-700">
								{employee.profileRemarks}
							</p>
						</div>
					</div>
				</div>
			) : null}

			<div className="grid gap-4 md:gap-8">
				<ProfileSection
					title="Personal Information"
					url={`/profile/${user.id}/edit?section=personal`}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ label: 'First Name', value: employee.firstName },
							{ label: 'Middle Name', value: employee.middleName },
							{ label: 'Family Name', value: employee.familyName },
							{ label: 'AU ID Number', value: employee.auIdNumber },
							{
								label: 'Date Issued',
								value: employee.dateIssued,
								isDate: true,
							},
							{
								label: 'Valid Until',
								value: employee.validUntil,
								isDate: true,
							},
							{
								label: 'National Passport Number',
								value: employee.nationalPassportNumber,
							},
							{ label: 'AU Passport Number', value: employee.auPassportNumber },
							{ label: 'Email', value: employee.email },
							{ label: 'Nationality', value: employee.country.name },
							{
								label: 'Date of Birth',
								value: employee.dateOfBirth,
								isDate: true,
							},
							{
								label: 'Special Conditions',
								value: employee.specialConditions,
							},
						].map((item, idx) => (
							<ProfileItem
								key={idx}
								label={item.label}
								value={item.value}
								isDate={item.isDate}
							/>
						))}
					</div>
				</ProfileSection>

				<ProfileSection
					title="Duty Station"
					url={`/profile/${user.id}/edit?section=station`}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ label: 'Duty Station', value: employee.department.organ.name },
							{ label: 'Department', value: employee.department.name },
							{ label: 'Building', value: employee.location.name },
							{ label: 'Floor', value: employee.floor.name },
							{ label: 'Office Number', value: employee.officeNumber },
							{ label: 'Zone', value: employee.zone },
							{ label: 'Team', value: employee.team },
							{
								label: 'Medically Trained',
								value: employee.medicallyTrained ? 'Yes' : 'No',
							},
						].map((item, idx) => (
							<ProfileItem key={idx} label={item.label} value={item.value} />
						))}
					</div>
				</ProfileSection>

				<ProfileSection
					title="Address"
					url={`/profile/${user.id}/edit?section=address`}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
							{ label: 'City', value: employee.city },
							{ label: 'Sub City', value: employee.subcity },
							// { label: 'Woreda', value: employee.woreda },
							{ label: 'Street', value: employee.street },
							// { label: 'Kebele', value: employee.kebele },
							{ label: 'House Number', value: employee.houseNumber },
							{
								label: 'House Telephone Number',
								value: employee.houseTelephoneNumber,
							},
							{
								label: 'Mobile Telephone Number',
								value: employee.mobileTelephoneNumber,
							},
							{
								label: 'Office Telephone Number',
								value: employee.officeTelephoneNumber,
							},
							{ label: 'Specific Location', value: employee.specificLocation },
							{ label: 'GPS Location', value: employee.gpsLocation },
							{
								label: 'Home Country Address',
								value: employee.homeCountryAddress,
							},
						].map((item, idx) => (
							<ProfileItem key={idx} label={item.label} value={item.value} />
						))}
					</div>
				</ProfileSection>
			</div>
		</div>
	)
}
