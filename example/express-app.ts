// examples/express-app.ts
import express from "express";
import { Agent } from "ai-agent-toolkit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Create the AI agent
const agent = new Agent({
  basePrompt:
    "You are a helpful AI assistant specialized in customer support for an e-commerce store.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [
    {
      name: "getCurrentTime",
      description: "Gets the current time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        return new Date().toISOString();
      },
    },
    {
      name: "searchProducts",
      description: "Search for products in the store",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          category: {
            type: "string",
            description: "Product category (optional)",
          },
        },
        required: ["query"],
      },
      execute: async (args) => {
        // This would normally call your actual product search API
        const mockProducts = [
          { id: "1", name: "Wireless Headphones", price: 99.99 },
          { id: "2", name: "Smartphone", price: 799.99 },
          { id: "3", name: "Laptop", price: 1299.99 },
        ];

        return JSON.stringify({
          results: mockProducts.filter((p) =>
            p.name.toLowerCase().includes(args.query.toLowerCase())
          ),
        });
      },
    },
  ],
  workflowSteps: [
    {
      name: "processCustomerQuery",
      description: "Process a customer query step by step",
      execute: async (agent, input) => {
        const analysis = await agent.processInput(
          `Analyze this customer query: ${input}`
        );
        return await agent.processInput(
          `Now provide a helpful response based on your analysis: ${analysis}`
        );
      },
    },
    {
      name: "handleProductInquiry",
      description: "Handle product inquiries with search and recommendations",
      execute: async (agent, input) => {
        const productSearch = await agent.processInput(
          `The customer is asking about products: "${input}". Identify what they're looking for and use the searchProducts tool if appropriate.`
        );
        return await agent.processInput(
          `Based on the search results, provide helpful product information and recommendations to the customer.`
        );
      },
    },
  ],
});

// Create API endpoints
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await agent.processInput(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/workflow", async (req, res) => {
  try {
    const { message, workflow } = req.body;
    const response = await agent.executeWorkflow(workflow, message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
