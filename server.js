#!/usr/bin/env node

/**
 * Expense Tracker MCP Server
 * 
 * A modular, database-agnostic MCP server for expense tracking with comprehensive
 * financial analysis capabilities.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import our modular components
import { config } from './src/config.js';
import { DatabaseFactory } from './src/database/factory.js';
import { toolDefinitions } from './src/tools/definitions.js';
import { ToolHandlers } from './src/tools/handlers.js';

/**
 * Main Server Class
 */
class ExpenseTrackerMCPServer {
  constructor() {
    this.database = null;
    this.server = null;
    this.toolHandlers = null;
  }

  async initialize() {
    try {
      // Validate configuration
      config.validate();
      
      // Initialize database
      const dbConfig = config.getDatabaseConfig();
      this.database = await DatabaseFactory.create(dbConfig);
      await this.database.initialize();
      
      // Initialize tool handlers
      this.toolHandlers = new ToolHandlers(this.database);
      
      // Create MCP server
      const serverConfig = config.getServerConfig();
      this.server = new Server(
        {
          name: serverConfig.name,
          version: serverConfig.version,
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Register tool handlers
      this.registerToolHandlers();
      
      console.error(`${serverConfig.name} v${serverConfig.version} initialized successfully`);
      
    } catch (error) {
      console.error('Failed to initialize server:', error);
      throw error;
    }
  }

  registerToolHandlers() {
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolDefinitions
      };
    });

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (config.get('server.debug')) {
        console.error(`Tool called: ${name}`, args);
      }
      
      return await this.toolHandlers.handleToolRequest(name, args);
    });
  }

  async start() {
    try {
      await this.initialize();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('Expense Tracker MCP server running on stdio');
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      if (this.database) {
        await this.database.close();
      }
      console.error('Server stopped gracefully');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
}

// Handle process signals for graceful shutdown
const server = new ExpenseTrackerMCPServer();

process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await server.stop();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  await server.stop();
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  server.start().catch(console.error);
}

export { ExpenseTrackerMCPServer };