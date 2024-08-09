import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	ActionFunctionArgs,
	LinksFunction,
	LoaderFunctionArgs,
	MetaFunction,
	redirect,
} from '@remix-run/node'
import {
	Form,
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
	useLocation,
	useSubmit,
} from '@remix-run/react'
import { CircleUser, Menu, Moon, Search, Sun, Users } from 'lucide-react'
import {
	AuthenticityTokenInput,
	AuthenticityTokenProvider,
} from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import tailwindStyleSheetUrl from '~/styles/tailwind.css?url'

import clsx from 'clsx'
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Toaster, toast as showToast } from 'sonner'
import { z } from 'zod'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { ErrorList } from './components/ErrorList'
import { GeneralErrorBoundary } from './components/ui/error-boundary'
import { mainNavigation } from './utils/constants'
import { csrf } from './utils/csrf.server'
import { prisma } from './utils/db.server'
import { getEnv } from './utils/env.server'
import { honeypot } from './utils/honeypot.server'
import { combineHeaders, invariantResponse } from './utils/misc'
import { sessionStorage } from './utils/session.server'
import { Theme, getTheme, setTheme } from './utils/theme.server'
import { Toast, getToast } from './utils/toast.server'
import { useOptionalUser, userHasRole } from './utils/user'

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
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request)
	const honeypotProps = honeypot.getInputProps()
	const { toast, headers: toastHeaders } = await getToast(request)
	const cookieSession = await sessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const userId = cookieSession.get('userId')
	const user = userId
		? await prisma.user.findUnique({
				select: {
					id: true,
					name: true,
					username: true,
					roles: {
						select: {
							name: true,
							permissions: {
								select: {
									action: true,
									entity: true,
									access: true,
								},
							},
						},
					},
				},
				where: { id: userId },
		  })
		: null

	if (userId && !user) {
		// Something weird happened
		// The usesr is authenticated but we can't find them in the database.
		// Maybe they were deleted or the database was reset.
		// Log them out
		throw redirect('/', {
			headers: {
				'set-cookie': await sessionStorage.destroySession(cookieSession),
			},
		})
	}

	return json(
		{
			theme: getTheme(request),
			toast,
			user,
			ENV: getEnv(),
			navigation: mainNavigation,
			honeypotProps,
			csrfToken,
		},
		{
			headers: combineHeaders(
				csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
				toastHeaders,
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
	isLoggedIn,
}: {
	children: React.ReactNode
	theme?: Theme
	env?: Record<string, string>
	isLoggedIn?: boolean
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
				{isLoggedIn ? <LogoutTimer /> : null}
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

function subscribe(onStoreChange: () => void) {
	window.addEventListener('online', onStoreChange)
	window.addEventListener('offline', onStoreChange)
	return () => {
		window.removeEventListener('online', onStoreChange)
		window.removeEventListener('offline', onStoreChange)
	}
}

function getSnapshot() {
	return window.navigator.onLine
}

function getServerSnapshot() {
	return true // Assume online for server-side rendering
}

function App() {
	const isOnline = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	)
	const data = useLoaderData<typeof loader>()
	const { navigation } = data
	const theme = useTheme()
	const user = useOptionalUser()
	const isAdmin = userHasRole(user, 'admin')
	// const isIncidentAdmin = userHasRole(user, 'incidentAdmin')
	// const isAccessRequestAdmin = userHasRole(user, 'accessRequestAdmin')
	// const isCarPassAdmin = userHasRole(user, 'carPassAdmin')
	// const isIdRequestAdmin = userHasRole(user, 'idRequestAdmin')
	// const isPhpAdmin = userHasRole(user, 'phpAdmin')
	// console.log({
	// 	isAdmin,
	// 	isIncidentAdmin,
	// 	isAccessRequestAdmin,
	// 	isCarPassAdmin,
	// 	isIdRequestAdmin,
	// 	isPhpAdmin,
	// })
	// const canDelete = userHasPermission(user, 'delete:country:any')
	// console.log('canDelete', canDelete)

	return (
		<Layout isLoggedIn={Boolean(user)} theme={theme} env={data.ENV}>
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

						{isAdmin ? (
							<>
								<NavLink
									to="/dashboard"
									className={({ isActive }) =>
										clsx(
											isActive ? 'text-foreground' : 'text-muted-foreground',
											'transition-colors hover:text-foreground',
										)
									}
								>
									Dashboard
								</NavLink>

								<NavLink
									to="/settings/general"
									className={({ isActive }) =>
										clsx(
											isActive ? 'text-foreground' : 'text-muted-foreground',
											'transition-colors hover:text-foreground',
										)
									}
								>
									Settings
								</NavLink>
							</>
						) : null}

						{user
							? navigation.map(item => {
									return (
										<NavLink
											key={item.name}
											to={
												item.href.includes('profile')
													? `/profile/${user.id}`
													: item.href
											}
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
							  })
							: null}
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

						{user ? (
							<div className="flex flex-row">
								<div className="flex flex-row items-center justify-between">
									<span className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
										{user?.name}
									</span>
									<CircleUser className="h-5 w-5" />
								</div>
								<Form action="/logout" method="POST">
									<AuthenticityTokenInput />
									<Button
										size="sm"
										type="submit"
										variant={'link'}
										className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100"
									>
										<span>Logout</span>
									</Button>
								</Form>
							</div>
						) : (
							<NavLink
								className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100"
								to="/login"
							>
								<span>Login</span>
							</NavLink>
						)}

						{isOnline ? <span>Online</span> : <span>Offline</span>}
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

function LogoutTimer() {
	const [status, setStatus] = useState<'idle' | 'show-modal'>('idle')
	const location = useLocation()
	const submit = useSubmit()
	// 🦉 normally you'd want these numbers to be much higher, but for the purpose
	// of this exercise, we'll make it short:
	// const logoutTime = 5000
	// const modalTime = 2000

	// 🦉 here's what would be more likely:
	const logoutTime = 1000 * 60 * 60 // 1 hour
	const modalTime = logoutTime - 1000 * 60 * 2 // 58 minutes
	const modalTimer = useRef<ReturnType<typeof setTimeout>>()
	const logoutTimer = useRef<ReturnType<typeof setTimeout>>()
	const [timeLeft, setTimeLeft] = useState<number>(0) // New state for time left
	const countdownTimer = useRef<ReturnType<typeof setInterval>>() // New ref for countdown timer

	const startCountdown = useCallback(() => {
		const initialTimeLeft = logoutTime / 1000 // Convert logoutTime to seconds
		setTimeLeft(initialTimeLeft)
		countdownTimer.current = setInterval(() => {
			setTimeLeft(prevTime => {
				if (prevTime <= 1) {
					clearInterval(countdownTimer.current)
					return 0
				}
				return prevTime - 1
			})
		}, 1000)
	}, [logoutTime])

	useEffect(() => {
		if (status === 'show-modal') {
			startCountdown()
		} else {
			clearInterval(countdownTimer.current)
		}
	}, [status, startCountdown])

	const logout = useCallback(() => {
		submit(null, { method: 'POST', action: '/logout' })
	}, [submit])

	const cleanupTimers = useCallback(() => {
		clearTimeout(modalTimer.current)
		clearTimeout(logoutTimer.current)
	}, [])

	const resetTimers = useCallback(() => {
		cleanupTimers()
		modalTimer.current = setTimeout(() => {
			setStatus('show-modal')
		}, modalTime)
		logoutTimer.current = setTimeout(logout, logoutTime)
	}, [cleanupTimers, logout, logoutTime, modalTime])

	useEffect(() => resetTimers(), [resetTimers, location.key])
	useEffect(() => cleanupTimers, [cleanupTimers])

	function closeModal() {
		setStatus('idle')
		resetTimers()
	}

	return (
		<AlertDialog
			aria-label="Pending Logout Notification"
			open={status === 'show-modal'}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you still there?</AlertDialogTitle>
				</AlertDialogHeader>
				<AlertDialogDescription>
					You are going to be logged out in {timeLeft} due to inactivity. Close
					this modal to stay logged in.
				</AlertDialogDescription>
				<AlertDialogFooter className="flex items-end gap-8">
					<AlertDialogCancel onClick={closeModal}>
						Remain Logged In
					</AlertDialogCancel>
					<Form method="POST" action="/logout">
						<AlertDialogAction type="submit">Logout</AlertDialogAction>
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

function ShowToast({ toast }: { toast: Toast }) {
	const { id, type, title, description } = toast
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
