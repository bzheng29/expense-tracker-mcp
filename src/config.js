/**
 * Configuration Management
 * 
 * This module handles configuration for the expense tracker MCP server.
 * It supports environment variables and default values.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Config {
  constructor() {
    this.config = {
      // Database configuration
      database: {
        type: process.env.DB_TYPE || 'sqlite',
        sqlite: {
          path: process.env.DB_PATH || path.join(__dirname, '../expense_tracker.db')
        },
        postgres: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'expense_tracker',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          ssl: process.env.DB_SSL === 'true'
        },
        mongodb: {
          url: process.env.MONGODB_URL || 'mongodb://localhost:27017/expense_tracker'
        }
      },
      
      // Server configuration
      server: {
        name: process.env.SERVER_NAME || 'expense-tracker',
        version: process.env.SERVER_VERSION || '1.0.0',
        debug: process.env.DEBUG === 'true'
      },
      
      // Application configuration
      app: {
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
        maxTransactionBatch: parseInt(process.env.MAX_TRANSACTION_BATCH) || 100,
        maxQueryLimit: parseInt(process.env.MAX_QUERY_LIMIT) || 100,
        seedData: process.env.SEED_DATA !== 'false'
      }
    };
  }

  get(path) {
    return this.getNestedValue(this.config, path);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  getDatabaseConfig() {
    const dbType = this.get('database.type');
    return {
      type: dbType,
      ...this.get(`database.${dbType}`)
    };
  }

  getServerConfig() {
    return this.get('server');
  }

  getAppConfig() {
    return this.get('app');
  }

  validate() {
    const required = [
      'database.type',
      'server.name',
      'server.version'
    ];

    const missing = required.filter(path => this.get(path) === undefined);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate database type
    const validDbTypes = ['sqlite', 'postgres', 'mongodb'];
    if (!validDbTypes.includes(this.get('database.type'))) {
      throw new Error(`Invalid database type: ${this.get('database.type')}. Must be one of: ${validDbTypes.join(', ')}`);
    }

    // Validate numeric values
    if (this.get('app.maxTransactionBatch') < 1 || this.get('app.maxTransactionBatch') > 1000) {
      throw new Error('maxTransactionBatch must be between 1 and 1000');
    }

    if (this.get('app.maxQueryLimit') < 1 || this.get('app.maxQueryLimit') > 1000) {
      throw new Error('maxQueryLimit must be between 1 and 1000');
    }

    return true;
  }
}

// Export a singleton instance
export const config = new Config();