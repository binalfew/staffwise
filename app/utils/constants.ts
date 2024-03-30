type NavigationItem = {
	name: string
	href: string
}

export const mainNavigation: NavigationItem[] = [
	{
		name: 'Profile',
		href: '/profile',
	},
	{
		name: 'Guests',
		href: '/guests',
	},
	{
		name: 'Incidents',
		href: '/incidents',
	},
]

export const settingsNavigation: NavigationItem[] = [
	{
		name: 'General',
		href: '/settings/general',
	},
	{
		name: 'Countries',
		href: '/settings/countries',
	},
	{
		name: 'Organs',
		href: '/settings/organs',
	},
	{
		name: 'Departments',
		href: '/settings/departments',
	},
	{
		name: 'Locations',
		href: '/settings/locations',
	},
	{
		name: 'Floors',
		href: '/settings/floors',
	},
	{
		name: 'Relationships',
		href: '/settings/relationships',
	},
]
