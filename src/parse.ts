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

            consumeLine(ctx);

            if (headersStr) {
                const headers = headersStr.slice(1, -1).split(',').map(h => h.trim());
                obj[key] = parseTabularArray(ctx, headers, indent + 1);
            } else {
                obj[key] = parseListArray(ctx, indent + 1);
            }
        } else {
            const key = keyPart;
            consumeLine(ctx);

            if (valPart === '') {
                const nextIndent = peekIndent(ctx);
                if (nextIndent > indent) {
                    const result = parseObjectBlock(ctx, indent);
                    obj[key] = Object.keys(result).length === 0 ? {} : result;
                } else {
                    obj[key] = {};
                }
            } else {
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
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inQuote) {
            current += char;
            if (char === '"' && str[i - 1] !== '\\') {
                inQuote = false;
            }
        } else {
            if (char === '"') {
                inQuote = true;
                current += char;
            } else if (char === '{') {
                braceDepth++;
                current += char;
            } else if (char === '}') {
                braceDepth--;
                current += char;
            } else if (char === '[') {
                bracketDepth++;
                current += char;
            } else if (char === ']') {
                bracketDepth--;
                current += char;
            } else if (char === delimiter && braceDepth === 0 && bracketDepth === 0) {
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

        if (lineContent.startsWith('-')) {
            consumeLine(ctx);
            const rest = lineContent.substring(1).trim();
            if (rest === '') {
                const obj = parseObjectBlock(ctx, indent);
                result.push(normalizeArrayLikeObject(obj));
            } else {
                result.push(parsePrimitive(stripComment(rest)));
            }
        } else {
            break;
        }
    }
    return result;
}

function normalizeArrayLikeObject(obj: Record<string, unknown>): unknown {
    const keys = Object.keys(obj);

    if (keys.length === 0) return obj;

    const numericKeys = keys.map(k => parseInt(k, 10));
    const allNumeric = numericKeys.every((n, i) => !isNaN(n) && keys[i] === String(n));

    if (!allNumeric) return obj;

    const sorted = [...numericKeys].sort((a, b) => a - b);
    const isSequential = sorted.every((n, i) => n === i) && sorted[0] === 0;

    if (!isSequential) return obj;

    const arr: unknown[] = [];
    for (let i = 0; i < keys.length; i++) {
        const val = obj[String(i)];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            arr.push(normalizeArrayLikeObject(val as Record<string, unknown>));
        } else {
            arr.push(val);
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
