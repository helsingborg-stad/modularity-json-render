import createDataUid, { normalizeDataUid } from './dataUid';

jest.mock('uuid', () => ({
	v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

describe('normalizeDataUid', () => {
	it('removes hyphen separators from a uuid value', () => {
		const normalizedValue = normalizeDataUid('123e4567-e89b-12d3-a456-426614174000');

		expect(normalizedValue).toBe('123e4567e89b12d3a456426614174000');
	});
});

describe('createDataUid', () => {
	it('creates a normalized data uid from the generated uuid value', () => {
		const dataUid = createDataUid();

		expect(dataUid).toBe('123e4567e89b12d3a456426614174000');
	});
});
