# HyperToon 🚀

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**HyperToon** is a high-performance, type-safe converter for **TOON** (Token-Oriented Object Notation).

It is designed for high-throughput applications where **speed** and **bundle size** are critical.

## 🏆 Competitive Benchmarks

We compared `hypertoon` against the Official `@toon-format/toon` and the leading competitor `json-toon` (10,000 records).

| Metric | HyperToon | Competitor (`json-toon`) | Official (`@toon-format`) |
|--------|-----------|--------------------------|---------------------------|
| **Bundle Size** | **🚀 3.5 KB** | 4.6 KB | 65.0 KB |
| **Serialize Speed**| **⚡ 119 ops/s** | 82 ops/s | 16 ops/s |
| **Parse Speed** | **40 ops/s** | 38 ops/s | 9 ops/s |
| **Compression (Flat)** | 58% Savings | **64% Savings** | 61% Savings |

> **Verdict**: HyperToon is **~45% faster at serialization** than the nearest competitor and **7x faster** than the official library, while being the **smallest package**.

## Features

- ⚡ **Hyper Optimized**: Cursor-based parser avoids memory spikes.
- 🦕 **Bun Native**: Built with Bun for speed and modern standards.
- 🔒 **Type-Safe**: `jsonify<T>()` provides full TypeScript support.
- ✨ **Official Syntax**: Fully compliant with TOON `key: value` specification.
- 🛡️ **Robust**: Handles complex nested JSON objects, unicode, and emojis.
- 📦 **Zero Runtime Dependencies**: Lightweight and dependency-free.
- 🔢 **Type Preservation**: Correctly handles numeric strings vs numbers (e.g., `"1.0"` vs `1`).

## Installation

```bash
bun add hypertoon
# or
npm install hypertoon
```

## Usage

### 1. Serialize (`toonify`)

Convert complex JSON data to TOON format.

```ts
import { toonify } from 'hypertoon';

const data = {
  project: "Titanium",
  active: true,
  metadata: {
    version: "1.0", // Preserved as string
    tags: ["fast", "secure", "scalable"]
  },
  users: [
    { id: 1, name: "Alice", role: "Admin", verified: true },
    { id: 2, name: "Bob", role: "User", verified: false }
  ]
};

const toon = toonify(data);
console.log(toon);
/* Output:
project: Titanium
active: true
metadata:
    version: "1.0"
    tags[3]:
        - fast
        - secure
        - scalable
users[2]{id,name,role,verified}:
    1,Alice,Admin,true
    2,Bob,User,false
*/
```

### 2. Parse (`jsonify`)

Parse TOON string back to JSON with full type safety.

```ts
import { jsonify } from 'hypertoon';

interface Config {
  server: {
    host: string;
    port: number;
  };
  endpoints: string[];
}

const toon = `
server:
    host: localhost
    port: 8080
endpoints[2]:
    - /api/v1
    - /health
`;

const config = jsonify<Config>(toon);
console.log(config.server.port); // 8080
```

## API Reference

### `toonify(data: unknown): string`

- **data**: The input JSON object or value to serialize.
- **Returns**: A TOON-formatted string.
- **Notes**: Automatically detects tabular data structures for compression.

### `jsonify<T = unknown>(toon: string): T`

- **toon**: The input TOON string to parse.
- **Returns**: The parsed object cast to type `T`.
- **Notes**: Supports standard TOON syntax, including tabular arrays and lists.

## Contributing

Contributions are welcome!

1.  Clone the repository.
2.  Install dependencies: `bun install`
3.  Run tests: `bun test`
4.  Run benchmarks: `bun run benchmark`

## License

MIT
