import { EyeClosedIcon } from '@radix-ui/react-icons'
import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, json, useLoaderData } from '@remix-run/react'
import { CheckIcon, PrinterIcon, XIcon } from 'lucide-react'
import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { prisma } from '~/utils/db.server'
import { formatDate, getEmployeeFileSrc, invariantResponse } from '~/utils/misc'
import { requireUserWithRoles } from '~/utils/permission.server'
import { redirectWithToast } from '~/utils/toast.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRoles(request, ['admin', 'phpAdmin'])

	const employeeId = params.employeeId

	const employee = await prisma.employee.findUnique({
		where: {
			id: employeeId,
		},
		include: {
			country: true,
			location: true,
			floor: true,
			department: { include: { organ: true } },
			spouses: true,
			dependants: true,
			vehicles: true,
		},
	})

	invariantResponse(
		employee,
		`Employee with id ${employeeId} does not exist.`,
		{
			status: 404,
		},
	)

	if (!employee) {
		throw await redirectWithToast(`/dashboard/php`, {
			type: 'message',
			title: 'Employee not found',
			description: `The employee with id ${employeeId} does not exist.`,
		})
	}

	return json({ employee })
}

export default function ProfileRoute() {
	const { employee } = useLoaderData<typeof loader>()

	type ProfileSectionProps = {
		title: string
		url: string
		children: React.ReactNode
		showApprove?: boolean
		showReject?: boolean
	}

	const ProfileSection: FC<ProfileSectionProps> = ({
		title,
		url,
		children,
		showApprove = false,
		showReject = false,
	}) => (
		<Card className="xl:col-span-2 bg-white shadow-sm rounded-sm">
			<CardHeader className="flex flex-row items-center py-2 px-6 bg-gray-100 rounded-t-lg">
				<div className="grid gap-1">
					<CardTitle className="text-base font-semibold leading-6 text-gray-900">
						{title}
					</CardTitle>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<div className="flex h-5 items-center space-x-4 text-sm">
						<Link to={url}>
							<EyeClosedIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
						</Link>
						<a href={getEmployeeFileSrc(employee.id)}>
							<PrinterIcon className="h-4 w-4 text-orange-500 hover:text-orange-700" />
						</a>

						{showApprove || showReject ? (
							<Separator orientation="vertical" />
						) : null}

						{showApprove && (
							<Link to={`/dashboard/php/${employee.id}/approve`}>
								<CheckIcon className="h-4 w-4 text-green-500 hover:text-green-700" />
							</Link>
						)}

						{showReject && (
							<Link to={`/dashboard/php/${employee.id}/reject`}>
								<XIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
							</Link>
						)}
					</div>
				</div>
			</CardHeader>
			<Separator className="mb-2" />
			<CardContent className="grid gap-8 p-6">{children}</CardContent>
		</Card>
	)

	type ProfileItemProps = {
		label: string
		value: string | number | undefined | null
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

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:gap-8">
				<Outlet />
				<ProfileSection
					title={`Personal Information: ${employee.auIdNumber} (${
						employee.profileStatus === 'APPROVED'
							? 'Approved'
							: employee.profileStatus === 'REJECTED'
							? 'Rejected'
							: 'Pending'
					})`}
					url={`/dashboard/php`}
					showApprove={employee.profileStatus === 'PENDING'}
					showReject={employee.profileStatus === 'PENDING'}
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

				<ProfileSection title="Duty Station" url={`/dashboard/php`}>
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

				<ProfileSection title="Address" url={`/dashboard/php`}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[
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
							<ProfileItem key={idx} label={item.label} value={item.value} />
						))}
					</div>
				</ProfileSection>

				<ProfileSection title="Spouses" url={`/dashboard/php`}>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>First Name</TableHead>
									<TableHead>Middle Name</TableHead>
									<TableHead>Family Name</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employee.spouses.length > 0 ? (
									employee.spouses.map((spouse: any) => (
										<TableRow key={spouse.id}>
											<TableCell className="py-1">{spouse.firstName}</TableCell>
											<TableCell className="py-1">
												{spouse.middleName}
											</TableCell>
											<TableCell className="py-1">
												{spouse.familyName}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} className="text-center">
											<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
												No spouses found
											</h3>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</ProfileSection>

				<ProfileSection title="Dependants" url={`/dashboard/php`}>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>First Name</TableHead>
									<TableHead>Middle Name</TableHead>
									<TableHead>Family Name</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employee.dependants.length > 0 ? (
									employee.dependants.map((dependant: any) => (
										<TableRow key={dependant.id}>
											<TableCell className="py-1">
												{dependant.firstName}
											</TableCell>
											<TableCell className="py-1">
												{dependant.middleName}
											</TableCell>
											<TableCell className="py-1">
												{dependant.familyName}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} className="text-center">
											<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
												No dependants found
											</h3>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</ProfileSection>

				<ProfileSection title="Vehicles" url={`/dashboard/php`}>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plate</TableHead>
									<TableHead>Make</TableHead>
									<TableHead>Model</TableHead>
									<TableHead>Year</TableHead>
									<TableHead>Color</TableHead>
									<TableHead>Capacity</TableHead>
									<TableHead>Ownership</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employee.vehicles.length > 0 ? (
									employee.vehicles.map((vehicle: any) => (
										<TableRow key={vehicle.id}>
											<TableCell className="py-1">
												{vehicle.plateNumber}
											</TableCell>
											<TableCell className="py-1">{vehicle.make}</TableCell>
											<TableCell className="py-1">{vehicle.model}</TableCell>
											<TableCell className="py-1">{vehicle.year}</TableCell>
											<TableCell className="py-1">{vehicle.color}</TableCell>
											<TableCell className="py-1">{vehicle.capacity}</TableCell>
											<TableCell className="py-1">
												{vehicle.ownership}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} className="text-center">
											<h3 className="mt-2 text-sm font-semibold text-muted-foreground">
												No vehicles found
											</h3>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</ProfileSection>
			</div>
		</div>
	)
}
