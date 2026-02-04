import { parseToon } from './parse';
import { toToon } from './stringify';

/**
 * Converts JSON data or JSON string to Toon format
 * @param data - JSON object or JSON string to convert
 * @returns Toon formatted string
 * @throws {Error} When input string is not valid JSON
 * @example
 * ```ts
 * // From object
 * const toon = toonify({ name: "John", age: 30 });
 * // From JSON string
 * const toon2 = toonify('{"name": "John", "age": 30}');
 * // Result: name: John
 * //         age: 30
 * ```
 */
export function toonify(data: unknown | string): string {
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return toToon(parsed);
        } catch {
            throw new Error('Input string is not valid JSON');
        }
    }
    return toToon(data);
}

/**
 * Converts Toon format string to JSON object
 * @param toon - Toon formatted string to parse
 * @returns Parsed JSON object
 * @example
 * ```ts
 * const data = jsonify(`name: John
 * age: 30`);
 * // Result: { name: "John", age: 30 }
 * ```
 */
export function jsonify<T = unknown>(toon: string): T {
    return parseToon(toon) as T;
}
