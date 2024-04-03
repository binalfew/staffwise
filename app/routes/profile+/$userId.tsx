import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, json, useLoaderData } from '@remix-run/react'
import {
	CreditCardIcon,
	DollarSignIcon,
	EditIcon,
	UserIcon,
	UsersIcon,
} from 'lucide-react'
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
			department: {
				include: { organ: true },
			},
			spouses: true,
			dependants: true,
			vehicles: true,
			incidents: true,
			accessRequests: true,
		},
	})

	return json({
		user,
		employee,
	})
}

export default function ProfileRoute() {
	const { user, employee } = useLoaderData<typeof loader>()

	return employee ? (
		<div className="grid gap-6">
			<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
				<Link to={`/profile/${user.id}/spouses`}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Spouses</CardTitle>
							<DollarSignIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{employee?.spouses.length}
							</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
				<Link to={`/profile/${user.id}/dependants`}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Dependants</CardTitle>
							<UsersIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{employee?.dependants.length}
							</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
				<Link to={`/profile/${user.id}/vehicles`}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Vehicles</CardTitle>
							<CreditCardIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{employee?.vehicles.length}
							</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
				<Link to={`/profile/${user.id}/incidents`}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Incidents</CardTitle>
							<CreditCardIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{employee?.incidents.length}
							</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
				<Link to={`/profile/${user.id}/guests`}>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Guests</CardTitle>
							<CreditCardIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{employee?.vehicles.length}
							</div>
							<p className="text-xs text-muted-foreground"></p>
						</CardContent>
					</Card>
				</Link>
			</div>
			<div className="grid gap-4 md:gap-8">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle className="text-base font-semibold leading-6 text-gray-900">
								Your Personal Information
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

					<CardContent className="grid gap-8">
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									readOnly
									id="firstName"
									placeholder={employee?.firstName}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="middleName">Middle Name</Label>
								<Input
									readOnly
									id="middleName"
									placeholder={employee?.middleName}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="familyName">Family Name</Label>
								<Input
									readOnly
									id="familyName"
									placeholder={employee?.familyName}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="auIdNumber">AU ID Number</Label>
								<Input
									readOnly
									id="auIdNumber"
									placeholder={employee?.auIdNumber}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="dateIssued">Date Issued</Label>
								<Input
									readOnly
									id="dateIssued"
									placeholder={employee?.dateIssued}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="validUntil">Valid Until</Label>
								<Input
									readOnly
									id="validUntil"
									placeholder={employee?.validUntil}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="nationalPassportNumber">
									National Passport Number
								</Label>
								<Input
									readOnly
									id="nationalPassportNumber"
									placeholder={employee?.nationalPassportNumber}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="auPassportNumber">AU Passport Number</Label>
								<Input
									readOnly
									id="auPassportNumber"
									placeholder={employee?.auPassportNumber}
									className="font-bold"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									readOnly
									id="email"
									placeholder={employee?.email}
									type="email"
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="countryId">Nationality</Label>
								<Input
									readOnly
									id="countryId"
									placeholder={employee?.country.name}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="dateOfBirth">Date of Birth</Label>
								<Input
									readOnly
									id="dateOfBirth"
									placeholder={employee?.dateOfBirth}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="departmentId">Duty Station</Label>
								<Input
									readOnly
									id="departmentId"
									placeholder={employee?.department.organ.name}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="departmentId">Department</Label>
								<Input
									readOnly
									id="departmentId"
									placeholder={employee?.department.name}
									className="font-bold"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="locationId">Building</Label>
								<Input
									readOnly
									id="locationId"
									placeholder={employee?.location.name}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="floorId">Floor</Label>
								<Input
									readOnly
									id="floorId"
									placeholder={employee?.floor.name}
									className="font-bold"
								/>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="officeNumber">Office Number</Label>
								<Input
									readOnly
									id="officeNumber"
									placeholder={employee?.officeNumber}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="zone">Zone</Label>
								<Input
									readOnly
									id="zone"
									placeholder={employee?.zone}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="team">Team</Label>
								<Input
									readOnly
									id="team"
									placeholder={employee?.team}
									className="font-bold"
								/>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="specialConditions">Special Conditions</Label>
								<Input
									readOnly
									id="specialConditions"
									placeholder={employee?.specialConditions}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="medicallyTrained">Medically Trained</Label>
								<Input
									readOnly
									id="medicallyTrained"
									placeholder={employee?.medicallyTrained ? 'Yes' : 'No'}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="city">City</Label>
								<Input
									readOnly
									id="city"
									placeholder={employee?.city}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="subcity">Sub City</Label>
								<Input
									readOnly
									id="subcity"
									placeholder={employee?.subcity}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="woreda">Woreda</Label>
								<Input
									readOnly
									id="woreda"
									placeholder={employee?.woreda}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="street">Street</Label>
								<Input
									readOnly
									id="street"
									placeholder={employee?.street}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="kebele">Kebele</Label>
								<Input
									readOnly
									id="kebele"
									placeholder={employee?.kebele}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="houseNumber">House Number</Label>
								<Input
									readOnly
									id="houseNumber"
									placeholder={employee?.houseNumber}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="houseTelephoneNumber">
									House Telephone Number
								</Label>
								<Input
									readOnly
									id="houseTelephoneNumber"
									placeholder={employee?.houseTelephoneNumber}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="mobileTelephoneNumber">
									Mobile Telephone Number
								</Label>
								<Input
									readOnly
									id="mobileTelephoneNumber"
									placeholder={employee?.mobileTelephoneNumber}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="officeTelephoneNumber">
									Office Telephone Number
								</Label>
								<Input
									readOnly
									id="officeTelephoneNumber"
									placeholder={employee?.officeTelephoneNumber}
									className="font-bold"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="specificLocation">Specific Location</Label>
								<Input
									readOnly
									id="specificLocation"
									placeholder={employee?.specificLocation}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="gpsLocation">GPS Location</Label>
								<Input
									readOnly
									id="gpsLocation"
									placeholder={employee?.gpsLocation}
									className="font-bold"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="homeCountryAddress">Home Country Address</Label>
								<Input
									readOnly
									id="homeCountryAddress"
									placeholder={employee?.homeCountryAddress}
									className="font-bold"
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	) : (
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
