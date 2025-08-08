# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Chat - An open-source AI chatbot application powered by Model Context Protocol (MCP), built with Next.js 15 and Vercel AI SDK. The app enables integration with multiple AI providers and MCP servers for extended tool capabilities.

## Core Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router with Turbopack)
- **AI Integration**: Vercel AI SDK with multiple providers (Groq, XAI)
- **MCP Protocol**: Model Context Protocol SDK for tool integration
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Bot Protection**: BotID for request validation

### Key AI Models
- **Kimi K2** (Moonshot AI via Groq) - Default model
- **Qwen 3 32B** (Alibaba via Groq)
- **Grok 3 Mini** (XAI)
- **Llama 4** (Meta via Groq)

### MCP Integration
The app supports connecting to MCP servers via:
- **HTTP Transport**: For standard HTTP-based MCP servers
- **SSE Transport**: For Server-Sent Events streaming connections

MCP servers are managed through a persistent context that:
- Maintains server connections across chat sessions
- Provides health checking and tool discovery
- Supports dynamic server addition/removal via UI

## Development Commands

```bash
# Development (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio GUI
```

## Key File Structure

```
/app                    # Next.js App Router
  /api                  # API routes
    /chat              # Main chat endpoint with MCP integration
    /chats             # Chat CRUD operations
    /mcp-health        # MCP server health checks
  /chat/[id]           # Dynamic chat pages
  layout.tsx           # Root layout with providers
  page.tsx             # Home page

/lib                   # Core utilities
  /context
    mcp-context.tsx    # MCP server management context
  /db
    schema.ts          # Drizzle ORM schema
    index.ts           # Database connection
  /hooks               # Custom React hooks
  mcp-client.ts        # MCP client initialization
  chat-store.ts        # Chat persistence logic

/ai
  providers.ts         # AI model configuration

/components            # React components
  chat.tsx             # Main chat interface
  mcp-server-manager.tsx # MCP server configuration UI
  /ui                  # shadcn/ui components
```

## High-Level Architecture

### Request Flow
1. **User Input** → Chat UI component
2. **API Route** (`/api/chat`) validates request with BotID
3. **MCP Context** provides active server connections
4. **AI SDK** streams response with tool calls
5. **Chat Store** persists messages to PostgreSQL
6. **UI Update** renders streamed response

### MCP Server Lifecycle
1. **Server Configuration**: User adds server via UI (URL + headers)
2. **Health Check**: `/api/mcp-health` validates server availability
3. **Tool Discovery**: Fetches available tools from server
4. **Client Creation**: Initializes MCP client with transport
5. **Tool Execution**: AI model invokes tools during chat
6. **Cleanup**: Disconnects clients when chat ends

### Database Schema
- **chats**: Stores chat sessions with user association
- **messages**: Stores individual messages with parts as JSON
  - Supports user, assistant, and tool message roles
  - Parts include text, tool calls, and tool results

## Environment Variables

Required environment variables (see `.env.example`):

```env
# AI Provider Keys
XAI_API_KEY=           # For Grok models
GROQ_API_KEY=          # For Groq-hosted models

# Database
DATABASE_URL=postgresql://...  # PostgreSQL connection string
```

## MCP Server Configuration

MCP servers are configured through the UI and stored in localStorage:
- Server configs persist across sessions
- Selected servers are remembered per user
- Headers support for authentication
- Real-time health monitoring

## Key Implementation Notes

### Streaming & Performance
- Uses Turbopack for faster development builds
- Implements response streaming with `smoothStream` for better UX
- Supports reasoning extraction for models with thinking capabilities
- Maximum 20 steps for tool execution chains

### Error Handling
- BotID validation on all chat requests
- Graceful MCP server connection failures
- Rate limit error messaging
- Automatic cleanup on request abort

### State Management
- MCP servers managed via React Context
- Chat history stored in PostgreSQL
- Local storage for API keys and server configs
- Session-based user identification

## Bot Protection

The app uses BotID to validate requests:
- Checks if requester is a bot
- Allows only "good bots" to access chat endpoints
- Configured via `withBotId` in `next.config.ts`