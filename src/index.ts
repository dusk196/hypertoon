
import { parseToon } from './parse';
import { toToon } from './stringify';

export function toonify(data: unknown | string): string {
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return toToon(parsed);
        } catch {
            // If not JSON, maybe treat as raw string? 
            // But specs say "Convert JSON to TOON".
            throw new Error('Input string is not valid JSON');
        }
    }
    return toToon(data);
}

export function jsonify<T = unknown>(toon: string): T {
    return parseToon(toon) as T;
}
