const INDENTS: string[] = [];
for (let i = 0; i < 17; i++) INDENTS[i] = '  '.repeat(i);

const NEEDS_QUOTE = /[,#:\n\r\[\]{}]|^\s|\s$/;

function getIndent(level: number): string {
    return level < INDENTS.length ? INDENTS[level]! : '  '.repeat(level);
}

export function toToon(data: unknown): string {
    return serializeObject(data, 0, true);
}

function serializeObject(obj: unknown, indentLevel: number, isRoot: boolean): string {
    if (obj === null || typeof obj !== 'object') {
        return '';
    }

    const record = obj as Record<string, unknown>;
    const indent = getIndent(indentLevel);
    let result = '';

    for (const [key, value] of Object.entries(record)) {
        if (value === undefined) continue;

        if (result.length > 0) result += '\n';

        if (Array.isArray(value)) {
            const keys = getCommonKeys(value);
            if (keys) {
                result += `${indent}${key}[${value.length}]{${keys.join(',')}}:`;
                const childIndent = getIndent(indentLevel + 1);
                for (const item of value) {
                    const row = keys.map(k => {
                        const v = (item as any)[k];
                        return serializePrimitive(v);
                    }).join(',');
                    result += `\n${childIndent}${row}`;
                }
            } else {
                const allPrimitives = value.every(item => !item || typeof item !== 'object');

                if (allPrimitives && value.length > 0) {
                    const items = value.map(v => serializePrimitive(v)).join(',');
                    result += `${indent}${key}[${value.length}]: ${items}`;
                } else {
                    result += `${indent}${key}[${value.length}]:`;
                    const childIndent = getIndent(indentLevel + 1);
                    for (const item of value) {
                        if (item && typeof item === 'object') {
                            result += `\n${childIndent}-`;
                            const nested = serializeObject(item, indentLevel + 2, false);
                            if (nested.length > 0) result += `\n${nested}`;
                        } else {
                            result += `\n${childIndent}- ${serializePrimitive(item)}`;
                        }
                    }
                }
            }
        } else if (value !== null && typeof value === 'object') {
            result += `${indent}${key}:`;
            const nested = serializeObject(value, indentLevel + 1, false);
            if (nested.length > 0) result += `\n${nested}`;
        } else {
            result += `${indent}${key}: ${serializePrimitive(value)}`;
        }
    }

    return result;
}

function serializePrimitive(val: unknown): string {
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    if (typeof val === 'string' && (val === '' || !isNaN(Number(val)) || NEEDS_QUOTE.test(val))) return JSON.stringify(val);
    return String(val);
}

function getCommonKeys(arr: unknown[]): string[] | null {
    if (!arr.length) return null;
    const first = arr[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) return null;

    const keys = Object.keys(first as object);
    const keyLen = keys.length;
    if (!keyLen) return null;

    for (let i = 1; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        if (Object.keys(item as object).length !== keyLen) return null;
        for (let j = 0; j < keyLen; j++) {
            if (!(keys[j]! in (item as object))) return null;
        }
    }
    return keys;
}
