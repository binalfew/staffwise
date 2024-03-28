import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	ActionFunctionArgs,
	LinksFunction,
	LoaderFunctionArgs,
	MetaFunction,
} from '@remix-run/node'
import {
	Link,
	Links,
	Meta,
	NavLink,
	Outlet,
	Scripts,
	ScrollRestoration,
	json,
	useFetcher,
	useFetchers,
	useLoaderData,
} from '@remix-run/react'
import { CircleUser, Menu, Moon, Search, Sun, Users } from 'lucide-react'
import os from 'node:os'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import tailwindStyleSheetUrl from '~/styles/tailwind.css?url'

import clsx from 'clsx'
import { useEffect } from 'react'
import { Toaster, toast as showToast } from 'sonner'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { ErrorList } from './components/ErrorList'
import { GeneralErrorBoundary } from './components/ui/error-boundary'
import { mainNavigation } from './utils/constants'
import { csrf } from './utils/csrf.server'
import { getEnv } from './utils/env.server'
import { honeypot } from './utils/honeypot.server'
import { combineHeaders, invariantResponse } from './utils/misc'
import { Theme, getTheme, setTheme } from './utils/theme.server'
import { toastSessionStorage } from './utils/toast.server'

const ThemeFormSchema = z.object({
	theme: z.enum(['light', 'dark']),
})

export const links: LinksFunction = () => {
	return [
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
		...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
	].filter(Boolean)
}

export async function loader({ request }: LoaderFunctionArgs) {
	const honeypotProps = honeypot.getInputProps()
	const toastCookieSession = await toastSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const toast = toastCookieSession.get('toast')
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request)

	return json(
		{
			username: os.userInfo().username,
			theme: getTheme(request),
			toast,
			ENV: getEnv(),
			navigation: mainNavigation,
			honeypotProps,
			csrfToken,
		},
		{
			headers: combineHeaders(
				csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : {},
				{
					'set-cookie': await toastSessionStorage.commitSession(
						toastCookieSession,
					),
				},
			),
		},
	)
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	invariantResponse(
		formData.get('intent') === 'update-theme',
		'Invalid intent',
		{ status: 400 },
	)

	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	if (submission.status !== 'success') {
		return json(submission.reply(), {
			status: submission.status === 'error' ? 400 : 200,
		})
	}

	const { theme } = submission.value

	return json(submission.reply(), {
		headers: { 'set-cookie': setTheme(theme) },
	})
}

function Layout({
	children,
	theme,
	env,
}: {
	children: React.ReactNode
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={`${theme}`}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<Toaster closeButton position="top-center" />
				<ScrollRestoration
					getKey={location => {
						return location.pathname
					}}
				/>
				<Scripts />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const { navigation } = data
	const theme = useTheme()

	return (
		<Layout theme={theme} env={data.ENV}>
			<div className="flex min-h-screen w-full flex-col">
				<header className="sticky top-0 flex h-12 items-center gap-4 border-b bg-background px-4 md:px-6">
					<nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
						<NavLink
							to="/"
							className="flex items-center gap-2 text-lg font-semibold md:text-base"
						>
							<Users className="h-6 w-6" />
							<span className="sr-only">Staffwise</span>
						</NavLink>

						{navigation.map(item => {
							return (
								<NavLink
									key={item.name}
									to={item.href}
									className={({ isActive }) =>
										clsx(
											isActive ? 'text-foreground' : 'text-muted-foreground',
											'transition-colors hover:text-foreground',
										)
									}
								>
									{item.name}
								</NavLink>
							)
						})}
					</nav>
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 md:hidden"
							>
								<Menu className="h-5 w-5" />
								<span className="sr-only">Toggle navigation menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="left">
							<nav className="grid gap-6 text-lg font-medium">
								<NavLink
									to="#"
									className="flex items-center gap-2 text-lg font-semibold"
								>
									<Users className="h-6 w-6" />
									<span className="sr-only">Staffwise</span>
								</NavLink>

								{navigation.map(item => {
									return (
										<NavLink
											key={item.name}
											to={item.href}
											className={({ isActive }) =>
												clsx(
													isActive
														? 'text-foreground'
														: 'text-muted-foreground',
													'transition-colors hover:text-foreground',
												)
											}
										>
											{item.name}
										</NavLink>
									)
								})}
							</nav>
						</SheetContent>
					</Sheet>
					<div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
						<form className="ml-auto flex-1 sm:flex-initial">
							<div className="relative">
								<Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search"
									className="pl-8 h-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
								/>
							</div>
						</form>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="secondary"
									size="icon"
									className="rounded-full h-8 w-8"
								>
									<CircleUser className="h-5 w-5" />
									<span className="sr-only">Toggle user menu</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Account</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link to="/settings/general">Settings</Link>
								</DropdownMenuItem>
								<DropdownMenuItem>Support</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>Logout</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<ThemeSwitch userPreference={theme} />
					</div>
				</header>
				<main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 bg-muted/40">
					<Outlet />
				</main>

				<footer className="flex w-full items-center justify-between border-t p-3">
					<p className="text-sm text-muted-foreground">
						© 2024 AUC. All rights reserved.
					</p>
					<nav className="flex gap-4">
						<Link
							className="text-sm text-muted-foreground hover:text-foreground"
							to="#"
						>
							Privacy Policy
						</Link>
						<Link
							className="text-sm text-muted-foreground hover:text-foreground"
							to="#"
						>
							Terms of Service
						</Link>
					</nav>
				</footer>
			</div>

			{data.toast ? <ShowToast toast={data.toast} /> : null}
		</Layout>
	)
}

export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<HoneypotProvider {...data.honeypotProps}>
				<App />
			</HoneypotProvider>
		</AuthenticityTokenProvider>
	)
}

function useTheme() {
	const data = useLoaderData<typeof loader>()
	const fetchers = useFetchers()
	const fetcher = fetchers.find(
		fetcher => fetcher.formData?.get('intent') === 'update-theme',
	)
	const optimisticTheme = fetcher?.formData?.get('theme') as Theme | undefined
	if (optimisticTheme === 'light' || optimisticTheme === 'dark') {
		return optimisticTheme
	}

	return data.theme
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme }) {
	const fetcher = useFetcher<typeof action>()

	const [form] = useForm({
		id: 'theme-switch',
		lastResult: fetcher.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ThemeFormSchema })
		},
	})

	const mode = userPreference ?? 'light'
	const nextMode = mode === 'light' ? 'dark' : 'light'
	const modeLabel = {
		light: (
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
		),
		dark: (
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
		),
	}

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					name="intent"
					value="update-theme"
					type="submit"
					className="flex h-8 w-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Staffwise' }, { name: 'description', content: 'Staffwise' }]
}

function ShowToast({ toast }: { toast: any }) {
	const { id, type, title, description } = toast as {
		id: string
		type: 'success' | 'message'
		title: string
		description: string
	}
	useEffect(() => {
		// This is a workaround to prevent the toast from showing up twice
		let isActive = true
		setTimeout(() => {
			if (isActive) {
				showToast[type](title, { id, description, closeButton: false })
			}
		}, 0)

		return () => {
			isActive = false
		}
	}, [description, id, title, type])

	return null
}

export function ErrorBoundary() {
	return (
		<Layout>
			<div className="flex-1">
				<GeneralErrorBoundary />
			</div>
		</Layout>
	)
}
