export function parseToon(toon: string): unknown {
    const ctx: Ctx = { input: toon, pos: 0, length: toon.length };
    skipEmpty(ctx);
    return parseObjectBlock(ctx, -1);
}

interface Ctx {
    input: string;
    pos: number;
    length: number;
}

function getIndent(ctx: Ctx): number {
    let spaces = 0;
    let i = ctx.pos;
    while (i < ctx.length) {
        const c = ctx.input.charCodeAt(i);
        if (c === 32) spaces++;
        else if (c === 9) spaces += 4;
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
            const c = ctx.input.charCodeAt(i);
            if (c === 32) spaces++;
            else if (c === 9) spaces += 4;
            else break;
            i++;
        }

        if (i >= ctx.length) return 0;

        const c = ctx.input.charCodeAt(i);
        if (c === 10 || c === 13) {
            if (c === 13 && ctx.input.charCodeAt(i + 1) === 10) i++;
            i++;
            continue;
        }

        if (c === 35) {
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
    const i = ctx.pos + indentOffset;
    if (i >= ctx.length) return true;
    const c = ctx.input.charCodeAt(i);
    return c === 10 || c === 13 || c === 35;
}

function consumeLine(ctx: Ctx) {
    const nl = ctx.input.indexOf('\n', ctx.pos);
    ctx.pos = nl === -1 ? ctx.length : nl + 1;
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

function parseObjectBlock(ctx: Ctx, parentIndent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    while (ctx.pos < ctx.length) {
        const indent = getIndent(ctx);

        if (isLineEmptyOrComment(ctx, indent)) {
            consumeLine(ctx);
            continue;
        }

        if (indent <= parentIndent) break;

        const lineEnd = getLineEnd(ctx);
        const lineContent = ctx.input.substring(ctx.pos + indent, lineEnd).trim();

        const colIndex = lineContent.indexOf(':');
        if (colIndex === -1) {
            consumeLine(ctx);
            continue;
        }

        const keyPart = lineContent.substring(0, colIndex).trim();
        const valPart = lineContent.substring(colIndex + 1).trim();

        let bracketStart = -1;
        for (let i = keyPart.length - 1; i >= 0; i--) {
            if (keyPart.charCodeAt(i) === 91) { bracketStart = i; break; }
        }

        if (bracketStart > 0) {
            const bracketEnd = keyPart.indexOf(']', bracketStart + 1);
            let isDigits = bracketEnd !== -1;
            if (isDigits) {
                for (let i = bracketStart + 1; i < bracketEnd; i++) {
                    const c = keyPart.charCodeAt(i);
                    if (c < 48 || c > 57) { isDigits = false; break; }
                }
            }
            if (isDigits) {
                const key = keyPart.substring(0, bracketStart).trim();
                const afterBracket = bracketEnd! + 1;
                const hasHeaders = afterBracket < keyPart.length && keyPart.charCodeAt(afterBracket) === 123 && keyPart.charCodeAt(keyPart.length - 1) === 125;

                if (hasHeaders) {
                    consumeLine(ctx);
                    const headers = keyPart.substring(afterBracket + 1, keyPart.length - 1).split(',').map(h => h.trim());
                    obj[key] = parseTabularArray(ctx, headers, indent + 1);
                } else if (afterBracket >= keyPart.length) {
                    if (valPart !== '') {
                        consumeLine(ctx);
                        const items = splitSmart(valPart);
                        obj[key] = items.map(item => parsePrimitive(stripComment(item)));
                    } else {
                        consumeLine(ctx);
                        obj[key] = parseListArray(ctx, indent + 1);
                    }
                } else {
                    consumeLine(ctx);
                    obj[keyPart] = parsePrimitive(stripComment(valPart));
                }
                continue;
            }
        }

        if (valPart === '') {
            consumeLine(ctx);
            const nextIndent = peekIndent(ctx);
            if (nextIndent > indent) {
                const result = parseObjectBlock(ctx, indent);
                obj[keyPart] = Object.keys(result).length === 0 ? {} : result;
            } else {
                obj[keyPart] = {};
            }
        } else {
            consumeLine(ctx);
            obj[keyPart] = parsePrimitive(stripComment(valPart));
        }
    }
    return obj;
}

function parseTabularArray(ctx: Ctx, headers: string[], minIndent: number): unknown[] {
    const result: unknown[] = [];
    const headerLen = headers.length;
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

        const values = splitSmart(lineContent);
        const rowObj: Record<string, unknown> = {};

        for (let i = 0; i < headerLen; i++) {
            if (i < values.length) {
                rowObj[headers[i]!] = parsePrimitive(stripComment(values[i] ?? ''));
            }
        }
        result.push(rowObj);
    }
    return result;
}

function splitSmart(str: string): string[] {
    const tokens: string[] = [];
    let start = 0;
    let inQuote = false;
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (inQuote) {
            if (c === 34 && str.charCodeAt(i - 1) !== 92) inQuote = false;
        } else if (c === 34) {
            inQuote = true;
        } else if (c === 123 || c === 91) {
            depth++;
        } else if (c === 125 || c === 93) {
            depth--;
        } else if (c === 44 && depth === 0) {
            tokens.push(str.substring(start, i).trim());
            start = i + 1;
        }
    }
    tokens.push(str.substring(start).trim());
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
                result.push(parsePrimitive(stripComment(lineContent.substring(2))));
            }
        } else {
            if (lineContent.indexOf(':') !== -1) break;
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

function parsePrimitive(val: string): unknown {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;

    const first = val.charCodeAt(0);
    const last = val.charCodeAt(val.length - 1);

    if (first === 34 && last === 34) {
        try { return JSON.parse(val); }
        catch { return val.slice(1, -1); }
    }

    if (first === 39 && last === 39) return val.slice(1, -1);

    if ((first === 91 && last === 93) || (first === 123 && last === 125)) {
        try { return JSON.parse(val); }
        catch { }
    }

    if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);

    return val;
}

function stripComment(str: string): string {
    const idx = str.indexOf('#');
    if (idx !== -1) return str.substring(0, idx).trim();
    return str;
}
