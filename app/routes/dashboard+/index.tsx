import { LoaderFunctionArgs } from '@remix-run/node'
import { json, useLoaderData } from '@remix-run/react'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '~/components/ui/chart'
import { GeneralErrorBoundary } from '~/components/ui/error-boundary'
import { prisma } from '~/utils/db.server'
import { requireUserWithRole } from '~/utils/permission.server'

import { TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Label,
	Pie,
	PieChart,
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	XAxis,
} from 'recharts'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const countries = await prisma.country.findMany({
		take: 5,
		select: { id: true, name: true, code: true },
	})

	const organs = await prisma.organ.findMany({
		take: 5,
		select: { id: true, name: true, code: true },
	})

	return json({
		countries,
		organs,
	})
}

export default function IndexRoute() {
	const { countries, organs } = useLoaderData<typeof loader>()
	const chartDataBar: any[] = [
		{ month: 'January', desktop: 186, mobile: 80 },
		{ month: 'February', desktop: 305, mobile: 200 },
		{ month: 'March', desktop: 237, mobile: 120 },
		{ month: 'April', desktop: 73, mobile: 190 },
		{ month: 'May', desktop: 209, mobile: 130 },
		{ month: 'June', desktop: 214, mobile: 140 },
	]

	const chartDataDonut = [
		{ browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
		{ browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
		{ browser: 'firefox', visitors: 287, fill: 'var(--color-firefox)' },
		{ browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
		{ browser: 'other', visitors: 190, fill: 'var(--color-other)' },
	]

	const chartData = [
		{ month: 'January', desktop: 186, mobile: 80 },
		{ month: 'February', desktop: 305, mobile: 200 },
		{ month: 'March', desktop: 237, mobile: 120 },
		{ month: 'April', desktop: 73, mobile: 190 },
		{ month: 'May', desktop: 209, mobile: 130 },
		{ month: 'June', desktop: 214, mobile: 140 },
	]

	const chartConfigBar = {
		desktop: {
			label: 'Desktop',
			color: 'hsl(var(--chart-1))',
		},
		mobile: {
			label: 'Mobile',
			color: 'hsl(var(--chart-2))',
		},
	} satisfies ChartConfig

	const chartConfigDonut = {
		visitors: {
			label: 'Visitors',
		},
		chrome: {
			label: 'Chrome',
			color: 'hsl(var(--chart-1))',
		},
		safari: {
			label: 'Safari',
			color: 'hsl(var(--chart-2))',
		},
		firefox: {
			label: 'Firefox',
			color: 'hsl(var(--chart-3))',
		},
		edge: {
			label: 'Edge',
			color: 'hsl(var(--chart-4))',
		},
		other: {
			label: 'Other',
			color: 'hsl(var(--chart-5))',
		},
	} satisfies ChartConfig

	const chartConfig = {
		desktop: {
			label: 'Desktop',
			color: 'hsl(var(--chart-1))',
		},
		mobile: {
			label: 'Mobile',
			color: 'hsl(var(--chart-2))',
		},
	} satisfies ChartConfig

	const totalVisitors = useMemo(() => {
		return chartDataDonut.reduce((acc, curr) => acc + curr.visitors, 0)
	}, [chartDataDonut])

	return (
		<div className="grid gap-6">
			<div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
				{/* <Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle className="text-base font-semibold leading-6 text-gray-900">
								Organs
							</CardTitle>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<Button asChild size="xs" className="ml-auto gap-1">
								<Link to="/settings/organs">
									<ArrowUpRightIcon className="h-4 w-4" />
									View All
								</Link>
							</Button>
						</div>
					</CardHeader>

					<CardContent className="grid gap-8">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Code</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{organs.map(organ => (
									<TableRow key={organ.id}>
										<TableCell>
											<div className="font-medium">{organ.name}</div>
										</TableCell>
										<TableCell className="text-right">{organ.code}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle className="text-base font-semibold leading-6 text-gray-900">
								Countries
							</CardTitle>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<Button asChild size="xs" className="ml-auto gap-1">
								<Link to="/settings/countries">
									<ArrowUpRightIcon className="h-4 w-4" />
									View All
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Code</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{countries.map(country => (
									<TableRow key={country.id}>
										<TableCell>
											<div className="font-medium">{country.name}</div>
										</TableCell>
										<TableCell className="text-right">{country.code}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card> */}
				<Card>
					<CardHeader>
						<CardTitle>Bar Chart - Multiple</CardTitle>
						<CardDescription>January - June 2024</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfigBar}>
							<BarChart accessibilityLayer data={chartDataBar}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="month"
									tickLine={false}
									tickMargin={10}
									axisLine={false}
									tickFormatter={value => value.slice(0, 3)}
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dashed" />}
								/>
								<Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
								<Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className="flex-col items-start gap-2 text-sm">
						<div className="flex gap-2 font-medium leading-none">
							Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							Showing total visitors for the last 6 months
						</div>
					</CardFooter>
				</Card>

				<Card className="flex flex-col">
					<CardHeader className="items-center pb-0">
						<CardTitle>Pie Chart - Donut with Text</CardTitle>
						<CardDescription>January - June 2024</CardDescription>
					</CardHeader>
					<CardContent className="flex-1 pb-0">
						<ChartContainer
							config={chartConfigDonut}
							className="mx-auto aspect-square max-h-[250px]"
						>
							<PieChart>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent hideLabel />}
								/>
								<Pie
									data={chartDataDonut}
									dataKey="visitors"
									nameKey="browser"
									innerRadius={60}
									strokeWidth={5}
								>
									<Label
										content={({ viewBox }) => {
											if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
												return (
													<text
														x={viewBox.cx}
														y={viewBox.cy}
														textAnchor="middle"
														dominantBaseline="middle"
													>
														<tspan
															x={viewBox.cx}
															y={viewBox.cy}
															className="fill-foreground text-3xl font-bold"
														>
															{totalVisitors.toLocaleString()}
														</tspan>
														<tspan
															x={viewBox.cx}
															y={(viewBox.cy || 0) + 24}
															className="fill-muted-foreground"
														>
															Visitors
														</tspan>
													</text>
												)
											}
										}}
									/>
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className="flex-col gap-2 text-sm">
						<div className="flex items-center gap-2 font-medium leading-none">
							Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							Showing total visitors for the last 6 months
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader className="items-center pb-4">
						<CardTitle>Radar Chart - Multiple</CardTitle>
						<CardDescription>
							Showing total visitors for the last 6 months
						</CardDescription>
					</CardHeader>
					<CardContent className="pb-0">
						<ChartContainer
							config={chartConfig}
							className="mx-auto aspect-square max-h-[250px]"
						>
							<RadarChart data={chartData}>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="line" />}
								/>
								<PolarAngleAxis dataKey="month" />
								<PolarGrid />
								<Radar
									dataKey="desktop"
									fill="var(--color-desktop)"
									fillOpacity={0.6}
								/>
								<Radar dataKey="mobile" fill="var(--color-mobile)" />
							</RadarChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className="flex-col gap-2 text-sm">
						<div className="flex items-center gap-2 font-medium leading-none">
							Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
						</div>
						<div className="flex items-center gap-2 leading-none text-muted-foreground">
							January - June 2024
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>You are not allowed to do that</p>,
			}}
		/>
	)
}
