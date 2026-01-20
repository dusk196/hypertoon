
export function parseToon(toon: string): unknown {
    const ctx = { input: toon, pos: 0, length: toon.length };
    skipEmpty(ctx);
    // Root level usually handled as object content properties if indented? 
    // Or "key: val" lines at root?
    // Official spec example starts with "context: ..."
    // So it's effectively a root object block without indentation?
    // Or indentation 0.

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
        const start = ctx.pos;
        // Peek indent
        const indent = getIndent(ctx);

        // If line is empty/comment, consume and continue
        if (isLineEmptyOrComment(ctx, indent)) {
            consumeLine(ctx);
            continue;
        }

        if (indent <= parentIndent) {
            // Dedent, end of block
            // IMPORTANT: Do NOT consume. Parent needs to read this line.
            break;
        }

        // Parse Key
        // Expect "key:" or "key[N]:" or "key[N]{...}:"
        // Find delimiter. Official spec uses ':' as separator for keys.

        // Read line content (without moving cursor too far yet)
        const lineEnd = getLineEnd(ctx);
        const lineContent = ctx.input.substring(ctx.pos + indent, lineEnd).trim();

        // Regex match for key structure
        // key: value
        // key[N]:
        // key[N]{...}:

        // Let's locate the first ':'
        const colIndex = lineContent.indexOf(':');
        if (colIndex === -1) {
            // Malformed or continuation? Skip
            consumeLine(ctx);
            continue;
        }

        const keyPart = lineContent.substring(0, colIndex).trim();
        const valPart = lineContent.substring(colIndex + 1).trim();

        // Check for Array notation in keyPart
        const arrayMatch = keyPart.match(/^(.+)\[(\d+)\](\{.*\})?$/);

        if (arrayMatch) {
            // Array
            const key = arrayMatch[1].trim();
            // const count = parseInt(arrayMatch[2]);
            const headersStr = arrayMatch[3]; // {headers} includes braces

            consumeLine(ctx); // Move past header

            if (headersStr) {
                // Tabular
                const headers = headersStr.slice(1, -1).split(',').map(h => h.trim());
                obj[key] = parseTabularArray(ctx, headers, indent + 1);
            } else {
                // Standard List
                obj[key] = parseListArray(ctx, indent + 1);
            }
        } else {
            // Standard Key: Value
            const key = keyPart;
            consumeLine(ctx); // consumed "key: val" line

            if (valPart === '') {
                // Block start?
                // Check next line indent
                const nextIndent = peekIndent(ctx);
                if (nextIndent > indent) {
                    obj[key] = parseObjectBlock(ctx, indent);
                } else {
                    obj[key] = ""; // Empty string
                }
            } else {
                // Primitive value
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

        // Smart Split
        const values = splitSmart(lineContent, ',');
        const rowObj: Record<string, unknown> = {};

        headers.forEach((h, i) => {
            if (i < values.length) {
                rowObj[h] = parsePrimitive(stripComment(values[i]));
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
                // Object block
                result.push(parseObjectBlock(ctx, indent)); // same indent as '-'? 
                // YAML: 
                // - 
                //   key: val
                // The keys are indented relative to '-'? 
                // User example:
                // team_members[2]:
                //     - 
                //         id: 101
                // So indentation increases.

                // Wait, if I call parseObjectBlock(ctx, indent), it expects > indent.
                // So it works.
            } else {
                // Primitive "- val"
                result.push(parsePrimitive(stripComment(rest)));
            }
        } else {
            // Not a dash item? could be multiline string? (not supported yet)
            break;
        }
    }
    return result;
}

// Helpers

function getIndent(ctx: Ctx): number {
    let spaces = 0;
    let i = ctx.pos;
    while (i < ctx.length) {
        const c = ctx.input[i];
        if (c === ' ') spaces++;
        else if (c === '\t') spaces += 4; // normalize
        else break;
        i++;
    }
    return spaces;
}

function peekIndent(ctx: Ctx): number {
    // Look ahead to next non-empty line
    let i = ctx.pos;
    while (i < ctx.length) {
        // Find start of line
        // Indent
        let spaces = 0;
        let lineStart = i;
        while (i < ctx.length) {
            const c = ctx.input[i];
            if (c === ' ') spaces++;
            else if (c === '\t') spaces += 4;
            else break;
            i++;
        }

        // found content or newline
        if (i >= ctx.length) return 0;

        const c = ctx.input[i];
        if (c === '\n' || c === '\r') {
            // Empty line, continue
            if (c === '\r' && ctx.input[i + 1] === '\n') i++;
            i++;
            continue;
        }

        if (c === '#') {
            // Comment, skip line
            const nextNL = ctx.input.indexOf('\n', i);
            if (nextNL === -1) return 0; // EOF
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
    if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);

    // JSON Object/Array
    if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
        try {
            return JSON.parse(val);
        } catch (e) {
            // ignore
        }
    }

    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        return val.slice(1, -1);
    }
    return val;
}

function stripComment(str: string) {
    const idx = str.indexOf('#');
    if (idx !== -1) return str.substring(0, idx).trim();
    return str;
}
