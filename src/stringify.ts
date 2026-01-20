
export function toToon(data: unknown): string {
    return serializeObject(data, 0);
}

function serializeObject(obj: unknown, indentLevel: number): string {
    if (obj === null || typeof obj !== 'object') {
        return '';
    }

    const record = obj as Record<string, unknown>;
    const lines: string[] = [];
    const indent = '    '.repeat(indentLevel);

    for (const [key, value] of Object.entries(record)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
            // Tabular check
            const keys = getCommonKeys(value);
            if (keys) {
                // Tabular
                lines.push(`${indent}${key}[${value.length}]{${keys.join(',')}}:`);
                for (const item of value) {
                    const row = keys.map(k => {
                        const v = (item as any)[k];
                        return serializePrimitive(v);
                    }).join(',');
                    lines.push(`${indent}    ${row}`);
                }
            } else {
                // List
                lines.push(`${indent}${key}[${value.length}]:`);
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        lines.push(`${indent}    -`);
                        lines.push(serializeObject(item, indentLevel + 2));
                    } else {
                        lines.push(`${indent}    - ${serializePrimitive(item)}`);
                    }
                }
            }
        } else if (value !== null && typeof value === 'object') {
            // Nested Object
            lines.push(`${indent}${key}:`);
            lines.push(serializeObject(value, indentLevel + 1));
        } else {
            // Primitive
            lines.push(`${indent}${key}: ${serializePrimitive(value)}`);
        }
    }

    return lines.join('\n');
}

function serializePrimitive(val: unknown): string {
    if (val === null) return 'null';
    if (typeof val === 'string') {
        if (val === '') return '""';
        if (/[,#:\n\r\[\]\{\}]/.test(val) || /^\s|\s$/.test(val)) {
            return JSON.stringify(val);
        }
        return val;
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }
    return String(val);
}

function getCommonKeys(arr: unknown[]): string[] | null {
    if (arr.length === 0) return null;
    const first = arr[0];
    if (!first || typeof first !== 'object') return null;

    const keys = Object.keys(first as object);
    if (keys.length === 0) return null;

    // Strict tabular check
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object') return null;
        // Allow arrays/objects

        const itemKeys = Object.keys(item as object);
        if (i > 0) {
            if (itemKeys.length !== keys.length) return null;
            if (!keys.every(k => k in item)) return null;
        }
    }
    return keys;
}
