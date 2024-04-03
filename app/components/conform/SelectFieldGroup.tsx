import {
	unstable_useControl as useControl,
	type FieldMetadata,
} from '@conform-to/react'
import { ComponentProps, useRef, type ElementRef } from 'react'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'

export const SelectFieldGroup = ({
	meta,
	items,
	placeholder,
	onValueChange,
	...props
}: {
	meta: FieldMetadata<string>
	items: Array<{
		name: string
		children: Array<{ name: string; value: string }>
	}>
	placeholder: string
	onValueChange?: (value: string) => void
} & ComponentProps<typeof Select>) => {
	const selectRef = useRef<ElementRef<typeof SelectTrigger>>(null)
	const control = useControl(meta)

	return (
		<>
			<select
				name={meta.name}
				defaultValue={meta.initialValue ?? ''}
				className="sr-only"
				ref={control.register}
				aria-hidden
				tabIndex={-1}
				onFocus={() => {
					selectRef.current?.focus()
				}}
			>
				<option value="" />
				{items.map(group => (
					<optgroup key={group.name} label={group.name}>
						{group.children.map(option => (
							<option key={option.value} value={option.value}>
								{option.name}
							</option>
						))}
					</optgroup>
				))}
			</select>

			<Select
				{...props}
				value={control.value ?? ''}
				onValueChange={value => {
					control.change(value)
					onValueChange?.(value)
				}}
				onOpenChange={open => {
					if (!open) {
						control.blur()
					}
				}}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{items.map(group => (
						<SelectGroup key={group.name}>
							<SelectLabel>{group.name}</SelectLabel>
							{group.children.map(child => (
								<SelectItem key={child.value} value={child.value}>
									{child.name}
								</SelectItem>
							))}
						</SelectGroup>
					))}
				</SelectContent>
			</Select>
		</>
	)
}
