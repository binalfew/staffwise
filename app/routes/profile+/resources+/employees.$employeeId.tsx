import { type LoaderFunctionArgs } from '@remix-run/node'
import path from 'path'
import PDFDocument from 'pdfkit'
import { prisma } from '~/utils/db.server'
import { invariantResponse } from '~/utils/misc'

export async function loader({ params }: LoaderFunctionArgs) {
	const { employeeId } = params
	invariantResponse(employeeId, 'Employee ID is required', { status: 400 })

	const employee = await prisma.employee.findUnique({
		where: { id: employeeId },
		select: {
			firstName: true,
			middleName: true,
			familyName: true,
			auIdNumber: true,
			dateIssued: true,
			validUntil: true,
			nationalPassportNumber: true,
			auPassportNumber: true,
			email: true,
			country: true,
			dateOfBirth: true,
			specialConditions: true,
			organ: true,
			department: true,
			location: true,
			floor: true,
			officeNumber: true,
			zone: true,
			team: true,
			medicallyTrained: true,
		},
	})

	invariantResponse(employee, 'Employee not found', { status: 404 })

	const doc = new PDFDocument()

	// Set up colors
	const headerColor = '#2E86C1'
	const textColor = '#2C3E50'
	const fieldLabelColor = '#34495E'
	const fieldValueColor = '#17202A'

	// Add page header with African Union emblem
	const emblemPath = path.join(process.cwd(), 'public', 'emblem.png')
	doc.image(emblemPath, 50, 50, { width: 50, height: 50 })

	// Position text to the right of the emblem
	doc.fillColor(headerColor).fontSize(20).text('African Union', 110, 50)
	doc.fontSize(16).text('Employee Information', 110, 80)

	// Adjust Y position to avoid overlap with the emblem
	const startY = 130

	// Add a line below the header
	doc
		.moveTo(50, startY - 10)
		.lineTo(550, startY - 10)
		.stroke(headerColor)

	// Personal Information title
	doc
		.fontSize(14)
		.fillColor(headerColor)
		.text('Personal Information', 50, startY)

	// Personal Information - Left column
	doc.fontSize(12).fillColor(fieldLabelColor)
	const addField = (label: string, value: string, x: number, y: number) => {
		doc.text(label, x, y)
		doc.fillColor(fieldValueColor).text(value, x, y + 15, { width: 250 })
		doc.fillColor(fieldLabelColor)
	}
	addField('First Name', employee.firstName, 60, startY + 30)
	addField('Family Name', employee.familyName, 60, startY + 80)
	addField(
		'Date Issued',
		employee.dateIssued?.toDateString() || '',
		60,
		startY + 130,
	)
	addField(
		'National Passport Number',
		employee.nationalPassportNumber || '',
		60,
		startY + 180,
	)
	addField('Email', employee.email || '', 60, startY + 230)
	addField(
		'Date of Birth',
		employee.dateOfBirth?.toDateString() || '',
		60,
		startY + 280,
	)

	// Personal Information - Right column
	addField('Middle Name', employee.middleName || '', 310, startY + 30)
	addField('AU ID Number', employee.auIdNumber, 310, startY + 80)
	addField(
		'Valid Until',
		employee.validUntil?.toDateString() || '',
		310,
		startY + 130,
	)
	addField(
		'AU Passport Number',
		employee.auPassportNumber || '',
		310,
		startY + 180,
	)
	addField('Nationality', employee.country?.name || '', 310, startY + 230)
	addField(
		'Special Conditions',
		employee.specialConditions || 'None',
		310,
		startY + 280,
	)

	// Duty Station title
	doc
		.fontSize(14)
		.fillColor(headerColor)
		.text('Duty Station', 50, startY + 350)

	// Duty Station - Left column
	doc.fontSize(12).fillColor(fieldLabelColor)
	addField('Duty Station', employee.organ.name || '', 60, startY + 380)
	addField('Building', employee.location.name || '', 60, startY + 430)
	addField('Office Number', employee.officeNumber || '', 60, startY + 480)
	addField('Team', employee.team || '', 60, startY + 530)

	// Duty Station - Right column
	addField('Department', employee.department.name || '', 310, startY + 380)
	addField('Floor', employee.floor.name || '', 310, startY + 430)
	addField('Zone', employee.zone || '', 310, startY + 480)
	addField(
		'Medically Trained',
		employee.medicallyTrained ? 'Yes' : 'No',
		310,
		startY + 530,
	)

	const pdfBuffer = await new Promise<Buffer>(resolve => {
		const chunks: Buffer[] = []
		doc.on('data', chunk => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.end()
	})

	return new Response(pdfBuffer, {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `attachment; filename="${employee.firstName}-${employee.familyName}-PersonalInfo.pdf"`,
		},
	})
}
