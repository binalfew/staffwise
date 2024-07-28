import { Button } from '~/components/ui/button'

export default function StatusButton({
	status,
}: {
	status: 'open' | 'closed'
}) {
	return <Button>{status}</Button>
}
