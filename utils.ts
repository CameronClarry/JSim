export function toId(input: string): string {
	return input.toLowerCase().replace(/[^a-z\d]/g, '');
}
