export function toToon(data: unknown): string {
    return serializeObject(data, 0);
}

function serializeObject(obj: unknown, indentLevel: number): string {
    if (obj === null || typeof obj !== 'object') {
        return '';
    }

    const record = obj as Record<string, unknown>;
    const lines: string[] = [];
    const indent = '  '.repeat(indentLevel);

    for (const [key, value] of Object.entries(record)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
            const keys = getCommonKeys(value);
            if (keys) {
                lines.push(`${indent}${key}[${value.length}]{${keys.join(',')}}:`);
                for (const item of value) {
                    const row = keys.map(k => {
                        const v = (item as any)[k];
                        return serializePrimitive(v);
                    }).join(',');
                    lines.push(`${indent}  ${row}`);
                }
            } else {
                // Check if all items are primitives
                const allPrimitives = value.every(item => !item || typeof item !== 'object');

                if (allPrimitives && value.length > 0) {
                    // Inline array: key[N]: val1,val2...
                    const items = value.map(v => serializePrimitive(v)).join(',');
                    lines.push(`${indent}${key}[${value.length}]: ${items}`);
                } else {
                    lines.push(`${indent}${key}[${value.length}]:`);
                    for (const item of value) {
                        if (item && typeof item === 'object') {
                            lines.push(`${indent}  -`);
                            lines.push(serializeObject(item, indentLevel + 2));
                        } else {
                            // Mixed array or objects - use bullets for safety
                            lines.push(`${indent}  - ${serializePrimitive(item)}`);
                        }
                    }
                }
            }
        } else if (value !== null && typeof value === 'object') {
            lines.push(`${indent}${key}:`);
            lines.push(serializeObject(value, indentLevel + 1));
        } else {
            lines.push(`${indent}${key}: ${serializePrimitive(value)}`);
        }
    }

    return lines.join('\n');
}

function serializePrimitive(val: unknown): string {
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    if (typeof val === 'string' && (val === '' || !isNaN(Number(val)) || /[,#:\n\r\[\]{}]|^\s|\s$/.test(val))) return JSON.stringify(val);
    return String(val);
}

function getCommonKeys(arr: unknown[]): string[] | null {
    if (!arr.length) return null;
    const first = arr[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) return null;

    const keys = Object.keys(first as object);
    if (!keys.length) return null;

    for (let i = 1; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        if (Object.keys(item as object).length !== keys.length || !keys.every(k => k in item)) return null;
    }
    return keys;
}
