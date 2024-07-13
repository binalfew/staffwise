import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, json, useLoaderData } from '@remix-run/react'
import {
	CreditCardIcon,
	DollarSignIcon,
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
import { invariantResponse } from '~/utils/misc'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	invariantResponse(user.id === params.userId, 'Not authorized', {
		status: 403,
	})

	const employee = await prisma.employee.findFirst({
		where: { email: user.email },
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

	return json({ user, employee })
}

const formatDate = (dateString: string | undefined): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(date)
}

export default function ProfileRoute() {
	const { user, employee } = useLoaderData<typeof loader>()

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
		children: React.ReactNode
	}

	const ProfileSection: FC<ProfileSectionProps> = ({ title, children }) => (
		<Card className="xl:col-span-2">
			<CardHeader className="flex flex-row items-center">
				<div className="grid gap-2">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						{title}
					</CardTitle>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<Button asChild size="xs" className="ml-auto gap-1">
						<Link to={`/profile/${user.id}/${employee ? 'edit' : 'new'}`}>
							<EditIcon className="h-4 w-4" />
							Update
						</Link>
					</Button>
				</div>
			</CardHeader>
			<Separator className="mb-4" />
			<CardContent className="grid gap-8">{children}</CardContent>
		</Card>
	)

	type ProfileItemProps = {
		label: string
		value: string | number | undefined
		isDate?: boolean
	}

	const ProfileItem: FC<ProfileItemProps> = ({ label, value, isDate }) => (
		<div className="space-y-2">
			<Label htmlFor={label}>{label}</Label>
			<Input
				readOnly
				id={label}
				placeholder={
					isDate && typeof value === 'string'
						? formatDate(value)
						: typeof value === 'string' || typeof value === 'number'
						? String(value)
						: ''
				}
				className="font-bold bg-gray-100" // Apply the background color for read-only state
			/>
		</div>
	)

	const renderCards = () => (
		<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
			{[
				{
					title: 'Spouses',
					icon: DollarSignIcon,
					count: employee.spouses.length,
					link: 'spouses',
				},
				{
					title: 'Dependants',
					icon: UsersIcon,
					count: employee.dependants.length,
					link: 'dependants',
				},
				{
					title: 'Vehicles',
					icon: CreditCardIcon,
					count: employee.vehicles.length,
					link: 'vehicles',
				},
				{
					title: 'Incidents',
					icon: CreditCardIcon,
					count: employee.incidents.length,
					link: 'incidents',
				},
				{
					title: 'Guests',
					icon: CreditCardIcon,
					count: employee.vehicles.length,
					link: 'guests',
				},
			].map((item, idx) => (
				<Link key={idx} to={`/profile/${user.id}/${item.link}`}>
					<Card>
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
			{renderCards()}
			<div className="grid gap-4 md:gap-8">
				<ProfileSection title="Your Personal Information">
					{[
						{ label: 'First Name', value: employee.firstName },
						{ label: 'Middle Name', value: employee.middleName },
						{ label: 'Family Name', value: employee.familyName },
						{ label: 'AU ID Number', value: employee.auIdNumber },
						{ label: 'Date Issued', value: employee.dateIssued, isDate: true },
						{ label: 'Valid Until', value: employee.validUntil, isDate: true },
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
						{ label: 'Duty Station', value: employee.department.organ.name },
						{ label: 'Department', value: employee.department.name },
						{ label: 'Building', value: employee.location.name },
						{ label: 'Floor', value: employee.floor.name },
						{ label: 'Office Number', value: employee.officeNumber },
						{ label: 'Zone', value: employee.zone },
						{ label: 'Team', value: employee.team },
						{ label: 'Special Conditions', value: employee.specialConditions },
						{
							label: 'Medically Trained',
							value: employee.medicallyTrained ? 'Yes' : 'No',
						},
						{ label: 'City', value: employee.city },
						{ label: 'Sub City', value: employee.subcity },
						{ label: 'Woreda', value: employee.woreda },
						{ label: 'Street', value: employee.street },
						{ label: 'Kebele', value: employee.kebele },
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
						<ProfileItem
							key={idx}
							label={item.label}
							value={item.value}
							isDate={item.isDate}
						/>
					))}
				</ProfileSection>
			</div>
		</div>
	)
}
