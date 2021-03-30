export function toId(input: string): string {
	return input.toLowerCase().replace(/[^a-z\d]/g, '');
}

export function cleanName(input: string): string {
	return input.replace(/[|,]/g, '');
}
