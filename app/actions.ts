"use server";

import { groq } from "@ai-sdk/groq";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Helper to extract text content from a message regardless of format
function getMessageText(message: any): string {
  // Check if the message has parts (new format)
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts.filter((p: any) => p.type === 'text' && p.text);
    if (textParts.length > 0) {
      return textParts.map((p: any) => p.text).join('\n');
    }
  }

  // Fallback to content (old format)
  if (typeof message.content === 'string') {
    return message.content;
  }

  // If content is an array (potentially of parts), try to extract text
  if (Array.isArray(message.content)) {
    const textItems = message.content.filter((item: any) =>
      typeof item === 'string' || (item.type === 'text' && item.text)
    );

    if (textItems.length > 0) {
      return textItems.map((item: any) =>
        typeof item === 'string' ? item : item.text
      ).join('\n');
    }
  }

  return '';
}

export async function generateTitle(messages: any[]): Promise<string> {
  try {
    // Find the first user message and use it for title generation
    const userMessage = messages.find(m => m.role === 'user');

    if (!userMessage) {
      return 'New Chat';
    }

    // Extract text content from the message
    const messageText = getMessageText(userMessage);

    if (!messageText.trim()) {
      return 'New Chat';
    }

    try {
      // Prioritize Groq API with the provided key
      const { object: titleObject } = await generateObject({
        model: groq('llama-3.1-8b-instant'),
        schema: z.object({
          title: z.string().describe("A short, descriptive title for the conversation in Chinese"),
        }),
        prompt: `为以下对话生成一个简洁的中文标题（最多8个字）: "${messageText.slice(0, 200)}"`,
      });

      return titleObject.title || 'New Chat';
    } catch (groqError) {
      console.error('Error calling Groq API for title generation:', groqError);
      
      // Fallback to Claude API
      try {
        const customClient = createOpenAI({
          apiKey: 'sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137',
          baseURL: 'https://api.apiyi.com/v1'
        });

        const { object: titleObject } = await generateObject({
          model: customClient('claude-sonnet-4-20250514'),
          schema: z.object({
            title: z.string().describe("A short, descriptive title for the conversation in Chinese"),
          }),
          prompt: `为以下对话生成一个简洁的中文标题（最多8个字）: "${messageText.slice(0, 200)}"`,
        });

        return titleObject.title || 'New Chat';
      } catch (claudeError) {
        console.error('Error calling Claude API for title generation:', claudeError);
        // Fall through to local title generation
      }
    }

    // Fallback: Generate title locally from message text
    const words = messageText.split(/\s+/).filter(word => word.length > 0);
    const titleLength = Math.min(words.length, 6);
    let title = words.slice(0, titleLength).join(' ');
    
    // Ensure title is not too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }
    
    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}
