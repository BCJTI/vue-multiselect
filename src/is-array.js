/**
 *
 * @param value
 * @returns {boolean}
 */
export default function isArray(value) {
	return Object.prototype.toString.call(value) === '[object Array]';
}
