# HyperToon 🚀

**HyperToon** is the fastest and lightest **TOON** (Token-Oriented Object Notation) converter for JavaScript/TypeScript.

It is designed for high-throughput applications where **speed** and **bundle size** are critical.

## 🏆 Competitive Benchmarks

We compared `hypertoon` against the Official `@toon-format/toon` and the leading competitor `json-toon` (10,000 records).

| Metric | HyperToon | Competitor (`json-toon`) | Official (`@toon-format`) |
|--------|-----------|--------------------------|---------------------------|
| **Bundle Size** | **🚀 3.5 KB** | 4.6 KB | 65.0 KB |
| **Parse Speed** | **⚡ 110 ops/s** | 44 ops/s | 10 ops/s |
| **Serialize Speed**| **⚡ 144 ops/s** | 98 ops/s | 19 ops/s |
| **Compression (Flat)** | 58% Savings | **64% Savings** | 61% Savings |

> **Verdict**: HyperToon is **2x faster** than the nearest competitor and **10x faster** than the official library, while being the **smallest package**.

## Features

- ⚡ **Hyper Optimized**: Cursor-based parser avoids memory spikes.
- 🦕 **Bun Native**: Built with Bun for speed and modern standards.
- 🔒 **Type-Safe**: `jsonify<T>()` provides full TypeScript support.
- ✨ **Official Syntax**: Fully compliant with TOON `key: value` specification.

## Installation

```bash
bun add hypertoon
# or
npm install hypertoon
```

## Usage

### 1. Serialize (`toonify`)

```ts
import { toonify } from 'hypertoon';

const data = {
  users: [
    { id: 1, name: "Alice", role: "Admin" },
    { id: 2, name: "Bob", role: "User" }
  ]
};

const toon = toonify(data);
// users[2]{id,name,role}:
//     1,Alice,Admin
//     2,Bob,User
```

### 2. Parse (`jsonify`)

```ts
import { jsonify } from 'hypertoon';

const toon = `
config:
    debug: true
    server:
        host: localhost
`;

const config = jsonify<{config: {debug: boolean}}>(toon);
```

## License

MIT
