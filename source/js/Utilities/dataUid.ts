import { v4 as uuidv4 } from 'uuid';

/**
 * Removes separator characters from a UUID string to match the expected fallback data-uid format.
 *
 * @param uuid The UUID value to normalize.
 * @returns The normalized UUID without separators.
 */
export const normalizeDataUid = (uuid: string): string => uuid.replaceAll('-', '');

/**
 * Generates a plugin-owned data-uid value, preferring the existing component uid when available.
 *
 * @param componentUid The existing component uid from the server-rendered view.
 * @param suffix Optional suffix for nested elements that require their own data-uid or id value.
 * @returns A data-uid value for the current component element.
 */
const createDataUid = (componentUid?: string, suffix?: string): string => {
	const baseUid = componentUid?.trim() || normalizeDataUid(uuidv4());

	return suffix ? `${baseUid}-${suffix}` : baseUid;
};

export default createDataUid;
