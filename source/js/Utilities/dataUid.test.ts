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
	it('uses the existing component uid when it is available', () => {
		const dataUid = createDataUid('module-uid');

		expect(dataUid).toBe('module-uid');
	});

	it('appends a suffix when a nested element needs its own identifier', () => {
		const dataUid = createDataUid('module-uid', 'search-input');

		expect(dataUid).toBe('module-uid-search-input');
	});

	it('falls back to a normalized generated uuid when no component uid is available', () => {
		const dataUid = createDataUid();

		expect(dataUid).toBe('123e4567e89b12d3a456426614174000');
	});
});
