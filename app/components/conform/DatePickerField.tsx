import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as React from 'react'

import {
	FieldMetadata,
	unstable_useControl as useControl,
} from '@conform-to/react'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '~/components/ui/popover'
import { cn } from '~/utils/misc'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'

export function DatePickerField({ meta }: { meta: FieldMetadata<Date> }) {
	const triggerRef = React.useRef<HTMLButtonElement>(null)
	const control = useControl(meta)
	const [isOpen, setIsOpen] = React.useState(false)
	const [selectedYear, setSelectedYear] = React.useState<number | null>(
		meta.initialValue
			? new Date(meta.initialValue).getFullYear()
			: new Date().getFullYear(),
	)
	const [selectedMonth, setSelectedMonth] = React.useState<number | null>(
		meta.initialValue
			? new Date(meta.initialValue).getMonth()
			: new Date().getMonth(),
	)
	const [month, setMonth] = React.useState<Date | undefined>(
		meta.initialValue ? new Date(meta.initialValue) : undefined,
	)

	React.useEffect(() => {
		if (selectedYear !== null) {
			setMonth(
				new Date(selectedYear, selectedMonth !== null ? selectedMonth : 0),
			)
		}
	}, [selectedYear, selectedMonth])

	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	]

	return (
		<div>
			<input
				className="sr-only"
				aria-hidden
				tabIndex={-1}
				ref={control.register}
				name={meta.name}
				defaultValue={
					meta.initialValue ? new Date(meta.initialValue).toISOString() : ''
				}
				onFocus={() => {
					triggerRef.current?.focus()
				}}
			/>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						ref={triggerRef}
						variant={'outline'}
						className={cn(
							'w-full justify-start text-left font-normal focus:ring-2 focus:ring-stone-950 focus:ring-offset-2',
							!control.value && 'text-muted-foreground',
						)}
						onClick={() => setIsOpen(true)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{control.value ? (
							format(control.value, 'PPP')
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="flex w-auto flex-col space-y-2 p-2">
					<div className="flex space-x-2">
						<Select
							onValueChange={value => {
								setSelectedYear(parseInt(value, 10))
							}}
							value={selectedYear !== null ? `${selectedYear}` : undefined}
						>
							<SelectTrigger>
								<SelectValue placeholder="Year">
									{selectedYear !== null ? `${selectedYear}` : 'Year'}
								</SelectValue>
							</SelectTrigger>
							<SelectContent position="popper">
								{Array.from({ length: 100 }, (_, i) => (
									<SelectItem key={i} value={`${i + 1920}`}>
										{i + 1920}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							onValueChange={value => {
								setSelectedMonth(parseInt(value, 10))
							}}
							value={selectedMonth !== null ? `${selectedMonth}` : undefined}
						>
							<SelectTrigger>
								<SelectValue placeholder="Month">
									{selectedMonth !== null ? months[selectedMonth] : 'Month'}
								</SelectValue>
							</SelectTrigger>
							<SelectContent position="popper">
								{months.map((month, index) => (
									<SelectItem key={index} value={`${index}`}>
										{month}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Calendar
						mode="single"
						selected={new Date(control.value ?? '')}
						onSelect={value => {
							control.change(value?.toISOString() ?? '')
							setIsOpen(false)
						}}
						initialFocus
						month={month}
						onMonthChange={setMonth}
					/>

					<div className="flex space-x-2 mt-2 w-full">
						<Button
							variant={'outline'}
							className="w-full"
							onClick={() => {
								control.change('')
								setIsOpen(false)
							}}
						>
							Clear
						</Button>
						<Button
							variant={'outline'}
							className="w-full"
							onClick={() => {
								control.change(new Date().toISOString())
								setIsOpen(false)
							}}
						>
							Today
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}
