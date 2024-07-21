import { Field, FieldError } from '~/components/Field'
import { DatePickerField } from '~/components/conform/DatePickerField'
import { InputField } from '~/components/conform/InputField'
import { SelectField } from '~/components/conform/SelectField'
import { Label } from '~/components/ui/label'

type FormFieldType = 'text' | 'hidden' | 'date' | 'select'

interface FormFieldProps {
	item: {
		field: any
		type: FormFieldType
		label?: string
		disabled?: boolean
		errors?: string[] | undefined
		data?: Array<{ name: string; value: string }>
	}
}

export default function FormField({ item }: FormFieldProps) {
	if (item.type === 'hidden') {
		return <InputField key={item.field.id} meta={item.field} type="hidden" />
	}

	if (item.type === 'date') {
		return (
			<Field key={item.field.id}>
				<Label htmlFor={item.field.id}>{item.label}</Label>
				<DatePickerField meta={item.field} />
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

	return (
		<Field key={item.field.id}>
			<Label htmlFor={item.field.id}>{item.label}</Label>
			<InputField meta={item.field} type={item.type} disabled={item.disabled} />
			{item.errors && <FieldError>{item.errors}</FieldError>}
		</Field>
	)
}
