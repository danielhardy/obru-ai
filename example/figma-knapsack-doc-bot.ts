/**
 * figma-knapsack-doc-bot.ts (Knapsack variant)
 * -------------------------------------------------
 *
 * This is UNTESTED code, provided for educational purposes only.
 *
 * End‑to‑end example of an Obru‑AI agent that
 *   1. Listens to **Figma** webhooks for design‑token updates
 *   2. Pulls those tokens
 *   3. Upserts documentation directly into a **Knapsack Cloud** instance
 *
 * ENVIRONMENT VARIABLES
 *   FIGMA_TOKEN          – Figma personal access token
 *   KNAPSACK_TOKEN       – Knapsack API token (Personal Access Token)
 *   KNAPSACK_API_URL     – e.g. "https://app.knapsack.cloud/api/graphql" (defaults)
 *   KNAPSACK_SPACE_SLUG  – Your space/org slug (e.g. "acme-design-system")
 *   (Optional) PORT      – HTTP port; defaults to 3000
 *
 * Run locally:
 *   $ npx ts-node figma-knapsack-doc-bot.ts
 */

import express from "express";
import fetch from "node-fetch";
import { Agent, ToolDefinition, Message } from "obru-ai";

const app = express();
app.use(express.json());

/* --------------------------------------------------
 * Tool: fetchTokens (unchanged)
 * -------------------------------------------------- */
const fetchTokens: ToolDefinition = {
  name: "fetchTokens",
  description: "Fetch raw JSON tokens from a Figma file key.",
  parameters: {
    type: "object",
    properties: { fileKey: { type: "string" } },
    required: ["fileKey"],
  },
  execute: async ({ fileKey }) => {
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        "X-Figma-Token": process.env.FIGMA_TOKEN!,
        "User-Agent": "obru-doc-bot",
      },
    });
    const json = await res.json();
    // Simplified: return only styles (real impl. would extract tokens node)
    return JSON.stringify(json.styles ?? {});
  },
};

/* --------------------------------------------------
 * Tool: knapsackUpsertDoc
 * -------------------------------------------------- */
const knapsackUpsertDoc: ToolDefinition = {
  name: "knapsackUpsertDoc",
  description:
    "Create or update a markdown page in Knapsack Cloud. Provide slug (e.g. tokens/colors) and markdown content.",
  parameters: {
    type: "object",
    properties: {
      slug: { type: "string" },
      mdContent: { type: "string" },
      commitMessage: { type: "string" },
    },
    required: ["slug", "mdContent", "commitMessage"],
  },
  execute: async ({ slug, mdContent, commitMessage }) => {
    const apiUrl =
      process.env.KNAPSACK_API_URL ?? "https://app.knapsack.cloud/api/graphql";

    const query = `mutation UpsertPage($slug: String!, $content: String!, $message: String!) {\n      upsertPage(input:{ slug:$slug, content:$content, message:$message }) {\n        page { id slug updatedAt }\n      }\n    }`;

    const body = {
      query,
      variables: {
        slug: `${process.env.KNAPSACK_SPACE_SLUG}/${slug}`.replace(/^\/+/, ""),
        content: mdContent,
        message: commitMessage,
      },
    };

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KNAPSACK_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "obru-doc-bot",
      },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    return JSON.stringify(json);
  },
};

/* --------------------------------------------------
 * Agent Setup
 * -------------------------------------------------- */
const agent = new Agent({
  basePrompt: `You are a documentation maintainer for Knapsack Cloud.\nWhen given fresh design tokens from Figma, decide which Knapsack page slug should be updated (e.g. "+tokens/colors" or "+tokens/spacing").\nGenerate concise markdown that reflects only the changed tokens in a \n| token | value | description | table.\nThen call \"knapsackUpsertDoc\" with that slug, the markdown, and a commit message.\nAfter tool calls finish, reply to the user with a one‑sentence summary.`,
  model: "gpt-4o-mini",
  tools: [fetchTokens, knapsackUpsertDoc],
});

/* --------------------------------------------------
 * webhook handler
 * -------------------------------------------------- */
app.post("/webhook/figma", async (req, res) => {
  try {
    const { file_key } = req.body;
    const messages: Message[] = [
      {
        role: "user",
        content: `Sync design tokens for Figma file ${file_key}.`,
      },
    ];
    const response = await agent.process(messages);
    res.json({ ok: true, agentResponse: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

app.listen(process.env.PORT ?? 3000, () => {
  console.log(`📚  Knapsack doc‑bot listening on :${process.env.PORT ?? 3000}`);
});
