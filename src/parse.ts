export function parseToon(toon: string): unknown {
    const ctx = { input: toon, pos: 0, length: toon.length };
    skipEmpty(ctx);
    return parseObjectBlock(ctx, -1);
}

interface Ctx {
    input: string;
    pos: number;
    length: number;
}

function parseObjectBlock(ctx: Ctx, parentIndent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    while (ctx.pos < ctx.length) {
        const indent = getIndent(ctx);

        if (isLineEmptyOrComment(ctx, indent)) {
            consumeLine(ctx);
            continue;
        }

        if (indent <= parentIndent) {
            break;
        }

        const lineEnd = getLineEnd(ctx);
        const lineContent = ctx.input.substring(ctx.pos + indent, lineEnd).trim();

        const colIndex = lineContent.indexOf(':');
        if (colIndex === -1) {
            consumeLine(ctx);
            continue;
        }

        const keyPart = lineContent.substring(0, colIndex).trim();
        const valPart = lineContent.substring(colIndex + 1).trim();

        const arrayMatch = keyPart.match(/^(.+)\[(\d+)](\{.*})?$/);

        if (arrayMatch) {
            const key = arrayMatch[1]?.trim() ?? '';
            const headersStr = arrayMatch[3];

            if (headersStr) {
                // Tabular array always consumes following lines
                consumeLine(ctx);
                const headers = headersStr.slice(1, -1).split(',').map(h => h.trim());
                obj[key] = parseTabularArray(ctx, headers, indent + 1);
            } else if (valPart !== '') {
                // Inline array: "key[N]: val1,val2"
                consumeLine(ctx);
                const items = splitSmart(valPart, ',');
                obj[key] = items.map(item => parsePrimitive(stripComment(item)));
            } else {
                // Multiline list array
                consumeLine(ctx);
                obj[key] = parseListArray(ctx, indent + 1);
            }
        } else {
            const key = keyPart;
            // Handle standard key-value
            if (valPart === '') {
                consumeLine(ctx); // Consume key line
                const nextIndent = peekIndent(ctx);
                if (nextIndent > indent) {
                    const result = parseObjectBlock(ctx, indent);
                    obj[key] = Object.keys(result).length === 0 ? {} : result;
                } else {
                    obj[key] = {};
                }
            } else {
                consumeLine(ctx);
                obj[key] = parsePrimitive(stripComment(valPart));
            }
        }
    }
    return obj;
}

function parseTabularArray(ctx: Ctx, headers: string[], minIndent: number): unknown[] {
    const result: unknown[] = [];
    while (ctx.pos < ctx.length) {
        const indent = getIndent(ctx);
        if (isLineEmptyOrComment(ctx, indent)) {
            consumeLine(ctx);
            continue;
        }
        if (indent < minIndent) break;

        const lineEnd = getLineEnd(ctx);
        const lineContent = ctx.input.substring(ctx.pos + indent, lineEnd).trim();
        consumeLine(ctx);

        const values = splitSmart(lineContent, ',');
        const rowObj: Record<string, unknown> = {};

        headers.forEach((h, i) => {
            if (i < values.length) {
                rowObj[h] = parsePrimitive(stripComment(values[i] ?? ''));
            }
        });
        result.push(rowObj);
    }
    return result;
}

function splitSmart(str: string, delimiter: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inQuote) {
            current += char;
            if (char === '"' && str[i - 1] !== '\\') inQuote = false;
        } else {
            if (char === '"') {
                inQuote = true;
                current += char;
            } else if (char === '{' || char === '[') {
                depth++;
                current += char;
            } else if (char === '}' || char === ']') {
                depth--;
                current += char;
            } else if (char === delimiter && depth === 0) {
                tokens.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    tokens.push(current.trim());
    return tokens;
}

function parseListArray(ctx: Ctx, minIndent: number): unknown[] {
    const result: unknown[] = [];
    while (ctx.pos < ctx.length) {
        const indent = getIndent(ctx);
        if (isLineEmptyOrComment(ctx, indent)) {
            consumeLine(ctx);
            continue;
        }
        if (indent < minIndent) break;

        const lineEnd = getLineEnd(ctx);
        const lineContent = ctx.input.substring(ctx.pos + indent, lineEnd).trim();

        if (lineContent === '-' || lineContent.startsWith('- ')) {
            consumeLine(ctx);
            if (lineContent === '-') {
                const obj = parseObjectBlock(ctx, indent);
                result.push(normalizeArrayLikeObject(obj));
            } else {
                const rest = lineContent.substring(2);
                result.push(parsePrimitive(stripComment(rest)));
            }
        } else {
            const colonIdx = lineContent.indexOf(':');
            if (colonIdx !== -1) {
                break;
            }
            consumeLine(ctx);
            result.push(parsePrimitive(stripComment(lineContent)));
        }
    }
    return result;
}

function normalizeArrayLikeObject(obj: Record<string, unknown>): unknown {
    const len = Object.keys(obj).length;
    if (len === 0) return obj;
    const arr = new Array(len);

    for (let i = 0; i < len; i++) {
        if (!(i in obj)) return obj;
        const val = obj[i];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            arr[i] = normalizeArrayLikeObject(val as Record<string, unknown>);
        } else {
            arr[i] = val;
        }
    }
    return arr;
}

function getIndent(ctx: Ctx): number {
    let spaces = 0;
    let i = ctx.pos;
    while (i < ctx.length) {
        const c = ctx.input[i];
        if (c === ' ') spaces++;
        else if (c === '\t') spaces += 4;
        else break;
        i++;
    }
    return spaces;
}

function peekIndent(ctx: Ctx): number {
    let i = ctx.pos;
    while (i < ctx.length) {
        let spaces = 0;
        while (i < ctx.length) {
            const c = ctx.input[i];
            if (c === ' ') spaces++;
            else if (c === '\t') spaces += 4;
            else break;
            i++;
        }

        if (i >= ctx.length) return 0;

        const c = ctx.input[i];
        if (c === '\n' || c === '\r') {
            if (c === '\r' && ctx.input[i + 1] === '\n') i++;
            i++;
            continue;
        }

        if (c === '#') {
            const nextNL = ctx.input.indexOf('\n', i);
            if (nextNL === -1) return 0;
            i = nextNL + 1;
            continue;
        }

        return spaces;
    }
    return 0;
}

function isLineEmptyOrComment(ctx: Ctx, indentOffset: number): boolean {
    let i = ctx.pos + indentOffset;
    if (i >= ctx.length) return true;
    const c = ctx.input[i];
    return c === '\n' || c === '\r' || c === '#';
}

function consumeLine(ctx: Ctx) {
    const nl = ctx.input.indexOf('\n', ctx.pos);
    if (nl === -1) {
        ctx.pos = ctx.length;
    } else {
        ctx.pos = nl + 1;
    }
}

function getLineEnd(ctx: Ctx): number {
    const nl = ctx.input.indexOf('\n', ctx.pos);
    return nl === -1 ? ctx.length : nl;
}

function skipEmpty(ctx: Ctx) {
    while (ctx.pos < ctx.length) {
        const indent = getIndent(ctx);
        if (!isLineEmptyOrComment(ctx, indent)) break;
        consumeLine(ctx);
    }
}

function parsePrimitive(val: string): unknown {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;

    if ((val.startsWith('"') && val.endsWith('"'))) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return val.slice(1, -1);
        }
    }

    if (val.startsWith("'") && val.endsWith("'")) {
        return val.slice(1, -1);
    }

    if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
        try {
            return JSON.parse(val);
        } catch (e) {
        }
    }

    if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);

    return val;
}

function stripComment(str: string) {
    const idx = str.indexOf('#');
    if (idx !== -1) return str.substring(0, idx).trim();
    return str;
}
