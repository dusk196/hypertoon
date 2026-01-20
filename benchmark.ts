
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

// 5. Bundle Size (Hardcoded from file system check)
console.log('\n📦 Bundle Size (Minified):');
console.log('HyperToon:  3.5 KB');
console.log('Competitor: 4.6 KB');
console.log('Official:   65.0 KB');

console.log('\nDone.');
