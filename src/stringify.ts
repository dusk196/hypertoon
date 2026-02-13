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
                lines.push(`${indent}${key}[${value.length}]:`);
                const allPrimitives = value.every(item => !item || typeof item !== 'object');
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        lines.push(`${indent}  -`);
                        lines.push(serializeObject(item, indentLevel + 2));
                    } else {
                        if (allPrimitives) {
                            lines.push(`${indent}  ${serializePrimitive(item)}`);
                        } else {
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
    if (val === null) return 'null';
    if (typeof val === 'string') {
        if (val === '') return '""';
        if (!isNaN(Number(val)) && val.trim() !== '') {
            return JSON.stringify(val);
        }
        if (/[,#:\n\r\[\]{}]/.test(val) || /^\s|\s$/.test(val)) {
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

    if (Array.isArray(first)) return null;

    const keys = Object.keys(first as object);
    if (keys.length === 0) return null;

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object') return null;
        if (Array.isArray(item)) return null;

        const itemKeys = Object.keys(item as object);
        if (i > 0) {
            if (itemKeys.length !== keys.length) return null;
            if (!keys.every(k => k in item)) return null;
        }
    }
    return keys;
}
