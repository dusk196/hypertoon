import { gzipSync } from 'node:zlib';
import { toonify, jsonify } from './src/index';
// @ts-ignore
import { encode as officialEncode, decode as officialDecode } from '@toon-format/toon';
// @ts-ignore
import { encode as competitorEncode, decode as competitorDecode } from 'json-toon';

console.log('🚀 Starting HyperToon Competitive Benchmarks...');

// Generate Data
const count = 10000;
const data = [];
for (let i = 0; i < count; i++) {
    data.push({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        active: i % 2 === 0,
        roles: ['admin', 'editor'],
        meta: {
            login_count: i * 10,
            last_ip: "192.168.1.1"
        }
    });
}
const wrapper = { users: data };

console.log(`📝 Generated ${count} records.`);

// 1. Size Comparison
const jsonString = JSON.stringify(wrapper);
const hyperString = toonify(wrapper);
const officialString = officialEncode(wrapper);
const competitorString = competitorEncode(wrapper);

const jsonSize = Buffer.byteLength(jsonString, 'utf8');
const hyperSize = Buffer.byteLength(hyperString, 'utf8');
const officialSize = Buffer.byteLength(officialString, 'utf8');
const competitorSize = Buffer.byteLength(competitorString, 'utf8');

console.log('\n📊 Payload Size (Standard Data):');
console.log(`JSON:       ${(jsonSize / 1024).toFixed(2)} KB`);
console.log(`HyperToon:  ${(hyperSize / 1024).toFixed(2)} KB (${((1 - hyperSize / jsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Official:   ${(officialSize / 1024).toFixed(2)} KB (${((1 - officialSize / jsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Competitor: ${(competitorSize / 1024).toFixed(2)} KB (${((1 - competitorSize / jsonSize) * 100).toFixed(1)}% savings)`);

// 2. Serialization Speed
console.log('\n⚡ Serialization Speed (ops/s):');

function measure(fn: () => void, name: string) {
    const start = performance.now();
    const iter = 20;
    for (let i = 0; i < iter; i++) fn();
    const end = performance.now();
    const ops = 1000 / ((end - start) / iter);
    console.log(`${name.padEnd(12)}: ${ops.toFixed(0)} ops/s`);
    return ops;
}

measure(() => JSON.stringify(wrapper), 'JSON');
measure(() => toonify(wrapper), 'HyperToon');
measure(() => officialEncode(wrapper), 'Official');
measure(() => competitorEncode(wrapper), 'Competitor');


// 3. Parse Speed
console.log('\n⚡ Parsing Speed (ops/s):');
// Pre-generate strings
const s1 = jsonString;
const s2 = hyperString;
const s3 = officialString;
const s4 = competitorString;

measure(() => JSON.parse(s1), 'JSON');
measure(() => jsonify(s2), 'HyperToon');
measure(() => officialDecode(s3), 'Official');
measure(() => competitorDecode(s4), 'Competitor');


// 4. Flat Data Optimization (Best Case)
console.log('\n🌟 Flat Data Optimization (Best Case):');
const flatData = [];
for (let i = 0; i < count; i++) {
    flatData.push({
        id: i,
        score: i * 1.5,
        code: "REF" + i,
        active: true,
        category: "A"
    });
}
const flatWrapper = { items: flatData };
const fJson = JSON.stringify(flatWrapper);
const fHyper = toonify(flatWrapper);
const fOfficial = officialEncode(flatWrapper);
const fCompetitor = competitorEncode(flatWrapper);

const fJsonSize = Buffer.byteLength(fJson);
const fHyperSize = Buffer.byteLength(fHyper);
const fOfficialSize = Buffer.byteLength(fOfficial);
const fCompSize = Buffer.byteLength(fCompetitor);

console.log(`JSON:       ${(fJsonSize / 1024).toFixed(2)} KB`);
console.log(`HyperToon:  ${(fHyperSize / 1024).toFixed(2)} KB (${((1 - fHyperSize / fJsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Official:   ${(fOfficialSize / 1024).toFixed(2)} KB (${((1 - fOfficialSize / fJsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Competitor: ${(fCompSize / 1024).toFixed(2)} KB (${((1 - fCompSize / fJsonSize) * 100).toFixed(1)}% savings)`);

// 5. Primitive Array Optimization
console.log('\n🔢 Large Primitive Array Optimization:');
const primitiveData = {
    numbers: Array.from({ length: 1000 }, (_, i) => i),
    strings: Array.from({ length: 1000 }, (_, i) => `item${i}`)
};

const pJson = JSON.stringify(primitiveData);
const pHyper = toonify(primitiveData);
const pOfficial = officialEncode(primitiveData);
const pCompetitor = competitorEncode(primitiveData);

const pJsonSize = Buffer.byteLength(pJson);
const pHyperSize = Buffer.byteLength(pHyper);
const pOfficialSize = Buffer.byteLength(pOfficial);
const pCompSize = Buffer.byteLength(pCompetitor);

console.log(`JSON:       ${(pJsonSize / 1024).toFixed(2)} KB`);
console.log(`HyperToon:  ${(pHyperSize / 1024).toFixed(2)} KB (${((1 - pHyperSize / pJsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Official:   ${(pOfficialSize / 1024).toFixed(2)} KB (${((1 - pOfficialSize / pJsonSize) * 100).toFixed(1)}% savings)`);
console.log(`Competitor: ${(pCompSize / 1024).toFixed(2)} KB (${((1 - pCompSize / pJsonSize) * 100).toFixed(1)}% savings)`);

// 6. Bundle Size (Minified & Gzipped)
console.log('\n📦 Bundle Size:');

const htPath = './dist/index.js';
const compPath = './node_modules/json-toon/dist/index.js';

let htSize = 0, htGzip = 0;
let compSize = 0, compGzip = 0;

const htFile = Bun.file(htPath);
if (await htFile.exists()) {
    const buf = await htFile.arrayBuffer();
    htSize = buf.byteLength;
    htGzip = gzipSync(new Uint8Array(buf)).length;
}

const compFile = Bun.file(compPath);
if (await compFile.exists()) {
    const buf = await compFile.arrayBuffer();
    compSize = buf.byteLength;
    compGzip = gzipSync(new Uint8Array(buf)).length;
}

const offPath = './node_modules/@toon-format/toon/dist/index.mjs';
let offSize = 0, offGzip = 0;

const offFile = Bun.file(offPath);
if (await offFile.exists()) {
    const buf = await offFile.arrayBuffer();
    offSize = buf.byteLength;
    offGzip = gzipSync(new Uint8Array(buf)).length;
}

if (htSize > 0) {
    const minSaved = compSize > 0 ? ` (${((1 - htSize / compSize) * 100).toFixed(1)}% savings vs competitor)` : '';
    console.log(`HyperToon  : ${(htSize / 1024).toFixed(2)} KB${minSaved}`);

    const gzipSaved = compGzip > 0 ? ` (${((1 - htGzip / compGzip) * 100).toFixed(1)}% savings)` : '';
    console.log(`Gzipped    : ${(htGzip / 1024).toFixed(2)} KB${gzipSaved}`);
} else {
    console.log('HyperToon  : (Build not found - run "bun run build")');
}

if (compSize > 0) {
    console.log(`Competitor : ${(compSize / 1024).toFixed(2)} KB`);
    console.log(`Gzipped    : ${(compGzip / 1024).toFixed(2)} KB`);
} else {
    console.log('Competitor : 4.6 KB (File not found - run "bun install")');
}

if (offSize > 0) {
    console.log(`Official   : ${(offSize / 1024).toFixed(2)} KB`);
    console.log(`Gzipped    : ${(offGzip / 1024).toFixed(2)} KB`);
} else {
    console.log('Official   : 25.0 KB (File not found)');
}

console.log('\nDone.');
