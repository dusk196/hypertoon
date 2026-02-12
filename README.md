# HyperToon 🚀

**HyperToon** is a high-performance, type-safe converter for **TOON** (Token-Oriented Object Notation).

It is designed for high-throughput applications where **speed** and **bundle size** are critical.

## 🏆 Competitive Benchmarks

We compared `hypertoon` against the Official `@toon-format/toon` and the leading competitor `json-toon` (10,000 records).

| Metric | HyperToon | Competitor (`json-toon`) | Official (`@toon-format`) |
|--------|-----------|--------------------------|---------------------------|
| **Bundle Size** | **3.5 KB** | 4.6 KB | 65.0 KB |
| **Serialize Speed**| **119 ops/s** | 82 ops/s | 16 ops/s |
| **Parse Speed** | **40 ops/s** | 38 ops/s | 9 ops/s |
| **Compression (Flat)** | 58% Savings | **64% Savings** | 61% Savings |

> **Verdict**: HyperToon is **~45% faster at serialization** than the nearest competitor and **7x faster** than the official library, while being the **smallest package**.

## Features

- **Hyper Optimized**: Cursor-based parser avoids memory spikes.
- **Bun Native**: Built with Bun for speed and modern standards.
- **Type-Safe**: `jsonify<T>()` provides full TypeScript support.
- **Official Syntax**: Fully compliant with TOON `key: value` specification.
- **Robust**: Handles complex nested JSON objects within tabular rows.

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
