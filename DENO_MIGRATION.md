# Deno Migration Guide

This guide helps existing Node.js users migrate to using obru-ai in Deno environments.

## Key Differences

### Installation

**Node.js:**
```bash
npm install github:danielhardy/obru-ai
```

**Deno:**
```bash
# From JSR (recommended)
deno add @obru/ai

# Or import directly
import { Agent } from "https://deno.land/x/obru_ai/src/index.ts";
```

### Environment Variables

**Node.js:**
```typescript
const apiKey = process.env.OPENAI_API_KEY!;
```

**Deno:**
```typescript
const apiKey = Deno.env.get("OPENAI_API_KEY")!;
```

### Import Statements

**Node.js:**
```typescript
import { Agent } from "obru-ai";
```

**Deno:**
```typescript
import { Agent } from "@obru/ai";
// or
import { Agent } from "https://deno.land/x/obru_ai/src/index.ts";
```

### Running Scripts

**Node.js:**
```bash
node your-script.js
# or with ts-node
npx ts-node your-script.ts
```

**Deno:**
```bash
deno run --allow-net --allow-env your-script.ts
```

## Permission System

Deno requires explicit permissions for security. Your obru-ai applications will need:

- `--allow-net`: For making HTTP requests to AI APIs
- `--allow-env`: For reading environment variables (API keys)

Example:
```bash
deno run --allow-net --allow-env my-ai-agent.ts
```

## File System Differences

### Node.js File Operations
```typescript
import fs from 'fs';
import path from 'path';

const data = fs.readFileSync(path.join(__dirname, 'data.txt'), 'utf8');
```

### Deno File Operations
```typescript
const data = await Deno.readTextFile('./data.txt');
```

## Complete Migration Example

### Before (Node.js)
```typescript
// package.json dependency: "obru-ai": "..."
import { Agent } from "obru-ai";
import express from "express";

const app = express();
app.use(express.json());

const agent = new Agent({
  basePrompt: "You are a helpful assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  const reply = await agent.processInput(message);
  res.json({ reply });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### After (Deno)
```typescript
// deno.json or import directly
import { Agent } from "@obru/ai";

const agent = new Agent({
  basePrompt: "You are a helpful assistant.",
  model: "gpt-4",
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

// Using Deno's built-in HTTP server
Deno.serve({ port: 3000 }, async (req) => {
  if (req.method === "POST" && new URL(req.url).pathname === "/chat") {
    const { message } = await req.json();
    const reply = await agent.processInput(message);
    return Response.json({ reply });
  }
  
  return new Response("Not Found", { status: 404 });
});

console.log("Server running on port 3000");
```

Run with:
```bash
deno run --allow-net --allow-env server.ts
```

## Testing Migration

### Node.js (Jest)
```typescript
import { Agent } from "obru-ai";

describe("Agent", () => {
  test("should create agent", () => {
    const agent = new Agent({
      basePrompt: "Test",
      model: "gpt-4",
      apiKey: "test-key",
    });
    expect(agent).toBeDefined();
  });
});
```

### Deno (Built-in Test Runner)
```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Agent } from "@obru/ai";

Deno.test("Agent - should create agent", () => {
  const agent = new Agent({
    basePrompt: "Test",
    model: "gpt-4",
    apiKey: "test-key",
  });
  assertExists(agent);
});
```

Run tests:
```bash
deno test --allow-net --allow-env
```

## Benefits of Migration

1. **No package.json**: Deno doesn't require package.json or node_modules
2. **Built-in TypeScript**: No need for separate TypeScript compilation
3. **Secure by default**: Explicit permissions for better security
4. **Standard library**: Rich standard library without external dependencies
5. **Modern APIs**: Built-in fetch, Web APIs, and ES modules

## Common Issues and Solutions

### Issue: Import errors with .ts extensions
**Solution**: Deno requires explicit file extensions in imports.

### Issue: Permission denied errors
**Solution**: Add the necessary permissions (`--allow-net`, `--allow-env`, etc.)

### Issue: Module not found
**Solution**: Use the correct import URL or ensure JSR package is properly added

### Issue: Environment variables not working
**Solution**: Use `Deno.env.get()` instead of `process.env`

## Additional Resources

- [Deno Manual](https://deno.land/manual)
- [JSR Registry](https://jsr.io/)
- [Deno Standard Library](https://deno.land/std)
- [Node to Deno Cheatsheet](https://deno.land/manual/node/cheatsheet)