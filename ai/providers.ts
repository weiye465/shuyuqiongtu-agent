import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createOpenAI } from "@ai-sdk/openai";

import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware
} from "ai";

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  apiVersion: string;
  capabilities: string[];
}

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

// Helper to get API keys from environment variables first, then localStorage
const getApiKey = (key: string): string | undefined => {
  // Default API Key for OpenAI (Custom Claude endpoint)
  if (key === 'OPENAI_API_KEY') {
    // Check for environment variables first
    if (process.env[key]) {
      return process.env[key] || undefined;
    }
    
    // Fall back to localStorage if available
    if (typeof window !== 'undefined') {
      const storedKey = window.localStorage.getItem(key);
      // Return stored key if exists, otherwise use default
      return storedKey || 'sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137';
    }
    
    // Return default key if no localStorage available
    return 'sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137';
  }
  
  // For other keys, use normal logic
  if (process.env[key]) {
    return process.env[key] || undefined;
  }

  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key) || undefined;
  }

  return undefined;
};

const groqClient = createGroq({
  apiKey: getApiKey('GROQ_API_KEY'),
});

const xaiClient = createXai({
  apiKey: getApiKey('XAI_API_KEY'),
});

// 自定义 OpenAI 兼容客户端（使用固定的 apiyi.com endpoint）
const customOpenAIClient = createOpenAI({
  apiKey: getApiKey('OPENAI_API_KEY'),
  baseURL: 'https://api.apiyi.com/v1'
});

const languageModels = {
  "qwen3-32b": wrapLanguageModel(
    {
      model: groqClient('qwen/qwen3-32b'),
      middleware
    }
  ),
  "grok-3-mini": xaiClient("grok-3-mini-latest"),
  "kimi-k2": groqClient('moonshotai/kimi-k2-instruct'),
  "llama4": groqClient('meta-llama/llama-4-scout-17b-16e-instruct'),
  "claude-sonnet-4": customOpenAIClient('kimi-k2-0711-preview')
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "kimi-k2": {
    provider: "Groq",
    name: "Kimi K2",
    description: "Latest version of Moonshot AI's Kimi K2 with good balance of capabilities.",
    apiVersion: "kimi-k2-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "qwen3-32b": {
    provider: "Groq",
    name: "Qwen 3 32B",
    description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
    apiVersion: "qwen3-32b",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "grok-3-mini": {
    provider: "XAI",
    name: "Grok 3 Mini",
    description: "Latest version of XAI's Grok 3 Mini with strong reasoning and coding capabilities.",
    apiVersion: "grok-3-mini-latest",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "llama4": {
    provider: "Groq",
    name: "Llama 4",
    description: "Latest version of Meta's Llama 4 with good balance of capabilities.",
    apiVersion: "llama-4-scout-17b-16e-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "claude-sonnet-4": {
    provider: "Custom API",
    name: "Claude Sonnet 4",
    description: "Anthropic's Claude Sonnet model - balanced performance with strong reasoning and faster response times.",
    apiVersion: "claude-sonnet-4-20250514",
    capabilities: ["Balanced Performance", "Fast Response", "Strong Reasoning", "Efficient"]
  }
};

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY')) {
      window.location.reload();
    }
  });
}

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "kimi-k2";
