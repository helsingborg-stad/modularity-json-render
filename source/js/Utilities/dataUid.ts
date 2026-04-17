import { v4 as uuidv4 } from 'uuid';

/**
 * Removes separator characters from a UUID string to match the expected data-uid format.
 *
 * @param uuid The UUID value to normalize.
 * @returns The normalized UUID without separators.
 */
export const normalizeDataUid = (uuid: string): string => uuid.replaceAll('-', '');

/**
 * Generates a plugin-owned data-uid value for components that can no longer rely on the component library.
 *
 * @returns A unique data-uid value.
 */
const createDataUid = (): string => normalizeDataUid(uuidv4());

export default createDataUid;
