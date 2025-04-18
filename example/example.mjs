// example.mjs
//---------------------------------------------------------------
// Minimal “batteries‑included” Obru demo with native fetch only
// Requires: Node 18+  (global fetch is built‑in)               |
//---------------------------------------------------------------
// import { Agent } from 'obru-ai';
import { Agent } from "../dist/index.js"; // ← Obru package

// 1️⃣  Define one toy tool
const helloTool = {
  name: "helloWorld",
  description: "Returns a friendly greeting.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => "👋  Hello from the tool!",
};

// 2️⃣  Spin up an agent
const agent = new Agent({
  apiKey: process.env.OPENAI_API_KEY, // ← export OPENAI_API_KEY=sk‑...
  model: "gpt-4o-mini", // any compatible model id
  basePrompt:
    "You are a concise, friendly AI assistant. Use the tool to say hello.",
  temperature: 0.7,
  tools: [helloTool],
});

// 3️⃣  Ask something that triggers the tool
(async () => {
  try {
    const answer = await agent.processInput("Say hello world.");
    console.log("\n🤖 Assistant:", answer);
  } catch (err) {
    console.error("Error:", err);
  }
})();
