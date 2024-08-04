import { Field, FieldError } from '~/components/Field'
import { DatePickerField } from '~/components/conform/DatePickerField'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Label } from '~/components/ui/label'
import { TextareaField } from './conform/TextareaField'

type FormFieldType = 'text' | 'textarea' | 'hidden' | 'date' | 'select' | 'file'

interface FormFieldProps {
	item: {
		field: any
		type: FormFieldType
		label?: string
		disabled?: boolean
		errors?: string[] | undefined
		data?: Array<{ name: string; value: string }>
		addon?: React.ReactNode
	}
}

export default function FormField({ item }: FormFieldProps) {
	if (item.type === 'hidden') {
		return <InputField key={item.field.id} meta={item.field} type="hidden" />
	}

	if (item.type === 'file') {
		return (
			<Field key={item.field.id}>
				<Label htmlFor={item.field.id}>{item.label}</Label>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<InputField meta={item.field} type="file" disabled={item.disabled} />
					{item.addon}
				</div>
				{item.errors && <FieldError>{item.errors}</FieldError>}
			</Field>
		)
	}

	if (item.type === 'date') {
		return (
			<Field key={item.field.id}>
				<Label htmlFor={item.field.id}>{item.label}</Label>
				<DatePickerField meta={item.field} disabled={item.disabled} />
				{item.errors && <FieldError>{item.errors}</FieldError>}
			</Field>
		)
	}

	if (item.type === 'select') {
		return (
			<Field key={item.field.id}>
				<Label htmlFor={item.field.id}>{item.label}</Label>
				<SelectField
					meta={item.field}
					items={item.data || []}
					placeholder="Select"
					disabled={item.disabled}
				/>
				{item.errors && <FieldError>{item.errors}</FieldError>}
			</Field>
		)
	}

	if (item.type === 'textarea') {
		return (
			<Field key={item.field.id}>
				<Label htmlFor={item.field.id}>{item.label}</Label>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: '8px',
					}}
				>
					<TextareaField meta={item.field} disabled={item.disabled} />
					{item.addon}
				</div>
				{item.errors && <FieldError>{item.errors}</FieldError>}
			</Field>
		)
	}

	return (
		<Field key={item.field.id}>
			<Label htmlFor={item.field.id}>{item.label}</Label>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<InputField
					meta={item.field}
					type={item.type}
					disabled={item.disabled}
					style={{ marginRight: '8px' }}
				/>
				{item.addon}
			</div>
			{item.errors && <FieldError>{item.errors}</FieldError>}
		</Field>
	)
}
