"use client";

import { createContext, useContext, useRef, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export interface KeyValuePair {
  key: string;
  value: string;
}

export type ServerStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

// Define storage keys as constants
const STORAGE_KEYS = {
  MCP_SERVERS: "mcp-servers",
  SELECTED_MCP_SERVERS: "selected-mcp-servers",
} as const;

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  type: "sse" | "http";
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
  description?: string;
  status?: ServerStatus;
  errorMessage?: string;
  tools?: MCPTool[];
}

export interface MCPServerApi {
  type: "sse" | "http";
  url: string;
  headers?: KeyValuePair[];
}

interface MCPContextType {
  mcpServers: MCPServer[];
  setMcpServers: (servers: MCPServer[]) => void;
  selectedMcpServers: string[];
  setSelectedMcpServers: (serverIds: string[]) => void;
  mcpServersForApi: MCPServerApi[];
  startServer: (serverId: string) => Promise<boolean>;
  stopServer: (serverId: string) => Promise<boolean>;
  updateServerStatus: (
    serverId: string,
    status: ServerStatus,
    errorMessage?: string
  ) => void;
  getActiveServersForApi: () => MCPServerApi[];
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

// Helper function to check server health and get tools
async function checkServerHealth(
  url: string,
  headers?: KeyValuePair[]
): Promise<{ ready: boolean; tools?: MCPTool[]; error?: string }> {
  try {
    const response = await fetch('/api/mcp-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, headers }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error checking server health for ${url}:`, error);
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Default MCP server configuration
const DEFAULT_MCP_SERVER: MCPServer = {
  id: "shuyuqiongtu-default",
  name: "shuyuqiongtu-mcp",
  url: "https://test-shis-mkc-a-hhyikwrvfv.cn-hangzhou.fcapp.run/sse",
  type: "sse",
  description: "数驭穹图默认MCP服务器",
};

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [mcpServers, setMcpServers] = useLocalStorage<MCPServer[]>(
    STORAGE_KEYS.MCP_SERVERS,
    []
  );

  const [selectedMcpServers, setSelectedMcpServers] = useLocalStorage<string[]>(
    STORAGE_KEYS.SELECTED_MCP_SERVERS,
    []
  );

  // Create a ref to track active servers and avoid unnecessary re-renders
  const activeServersRef = useRef<Record<string, boolean>>({});
  
  // Initialize default server on first load
  useEffect(() => {
    // Check if default server exists
    const hasDefaultServer = mcpServers.some(
      server => server.id === DEFAULT_MCP_SERVER.id
    );
    
    // Add default server if it doesn't exist
    if (!hasDefaultServer) {
      setMcpServers(prev => [DEFAULT_MCP_SERVER, ...prev]);
    }
    
    // Ensure default server is selected
    if (!selectedMcpServers.includes(DEFAULT_MCP_SERVER.id)) {
      setSelectedMcpServers(prev => [DEFAULT_MCP_SERVER.id, ...prev]);
    }
  }, []); // Run only once on mount

  // Helper to get a server by ID
  const getServerById = (serverId: string): MCPServer | undefined => {
    return mcpServers.find((server) => server.id === serverId);
  };

  // Update server status
  const updateServerStatus = (
    serverId: string,
    status: ServerStatus,
    errorMessage?: string
  ) => {
    setMcpServers((currentServers) =>
      currentServers.map((server) =>
        server.id === serverId
          ? { ...server, status, errorMessage: errorMessage || undefined }
          : server
      )
    );
  };

  // Update server with tools
  const updateServerWithTools = (
    serverId: string,
    tools: MCPTool[],
    status: ServerStatus = "connected"
  ) => {
    setMcpServers((currentServers) =>
      currentServers.map((server) =>
        server.id === serverId
          ? { ...server, tools, status, errorMessage: undefined }
          : server
      )
    );
  };

  // Get active servers formatted for API usage
  const getActiveServersForApi = (): MCPServerApi[] => {
    return selectedMcpServers
      .map((id) => getServerById(id))
      .filter(
        (server): server is MCPServer =>
          !!server && server.status === "connected"
      )
      .map((server) => ({
        type: server.type,
        url: server.url,
        headers: server.headers,
      }));
  };

  // Start a server using MCP SDK
  const startServer = async (serverId: string): Promise<boolean> => {
    const server = getServerById(serverId);
    if (!server) {
      console.error(`[startServer] Server not found for ID: ${serverId}`);
      return false;
    }

    console.log(
      `[startServer] Starting server: ${server.name} (${server.type})`
    );

    // Mark server as connecting
    updateServerStatus(serverId, "connecting");

    try {
      console.log(
        `[startServer] Checking ${server.type} server at: ${server.url}`
      );

      if (!server.url) {
        console.error(
          `[startServer] No URL provided for ${server.type} server`
        );
        updateServerStatus(serverId, "error", "No URL provided");
        return false;
      }

      const healthResult = await checkServerHealth(server.url, server.headers);
      
      if (healthResult.ready && healthResult.tools) {
        updateServerWithTools(serverId, healthResult.tools, "connected");
        activeServersRef.current[serverId] = true;
        return true;
      } else {
        updateServerStatus(
          serverId,
          "error",
          healthResult.error || "Could not connect to server"
        );
        return false;
      }
    } catch (error) {
      console.error(`[startServer] Error starting server:`, error);
      updateServerStatus(
        serverId,
        "error",
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  };

  // Stop a server
  const stopServer = async (serverId: string): Promise<boolean> => {
    const server = getServerById(serverId);
    if (!server) return false;

    try {
      // Mark as not active
      delete activeServersRef.current[serverId];

      // Update server status and clear tools
      setMcpServers((currentServers) =>
        currentServers.map((s) =>
          s.id === serverId
            ? { ...s, status: "disconnected", tools: undefined, errorMessage: undefined }
            : s
        )
      );
      return true;
    } catch (error) {
      console.error(`Error stopping server ${serverId}:`, error);
      return false;
    }
  };
  
  // Auto-connect default server when it's selected
  useEffect(() => {
    if (selectedMcpServers.includes(DEFAULT_MCP_SERVER.id)) {
      const defaultServer = mcpServers.find(s => s.id === DEFAULT_MCP_SERVER.id);
      if (defaultServer && (!defaultServer.status || defaultServer.status === "disconnected")) {
        // Auto-start the default server
        startServer(DEFAULT_MCP_SERVER.id).then(success => {
          if (success) {
            console.log("Default MCP server connected successfully");
          }
        }).catch(error => {
          console.error("Failed to connect default MCP server:", error);
        });
      }
    }
  }, [selectedMcpServers.includes(DEFAULT_MCP_SERVER.id), mcpServers.find(s => s.id === DEFAULT_MCP_SERVER.id)?.status]);

  // Calculate mcpServersForApi based on current state
  const mcpServersForApi = getActiveServersForApi();

  return (
    <MCPContext.Provider
      value={{
        mcpServers,
        setMcpServers,
        selectedMcpServers,
        setSelectedMcpServers,
        mcpServersForApi,
        startServer,
        stopServer,
        updateServerStatus,
        getActiveServersForApi,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCP must be used within a MCPProvider");
  }
  return context;
}
