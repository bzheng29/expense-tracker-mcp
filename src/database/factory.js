/**
 * Database Factory
 * 
 * Factory pattern for creating database adapters based on configuration.
 * This allows for easy addition of new database types without modifying the core server code.
 */

import { SQLiteAdapter } from './sqlite-adapter.js';

export class DatabaseFactory {
  /**
   * Create a database adapter based on configuration
   * @param {Object} config - Database configuration
   * @returns {DatabaseInterface} Database adapter instance
   */
  static async create(config) {
    const { type, ...options } = config;
    
    switch (type) {
      case 'sqlite':
        return new SQLiteAdapter(options.path);
      
      case 'postgres':
        // Future implementation
        const { PostgreSQLAdapter } = await import('./postgres-adapter.js');
        return new PostgreSQLAdapter(options);
      
      case 'mongodb':
        // Future implementation
        const { MongoDBAdapter } = await import('./mongodb-adapter.js');
        return new MongoDBAdapter(options);
      
      case 'mysql':
        // Future implementation
        const { MySQLAdapter } = await import('./mysql-adapter.js');
        return new MySQLAdapter(options);
      
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Get list of supported database types
   * @returns {Array<string>} List of supported database types
   */
  static getSupportedTypes() {
    return [
      'sqlite',
      // 'postgres',  // Uncomment when implemented
      // 'mongodb',   // Uncomment when implemented
      // 'mysql',     // Uncomment when implemented
    ];
  }

  /**
   * Validate database configuration
   * @param {Object} config - Database configuration to validate
   * @throws {Error} If configuration is invalid
   */
  static validateConfig(config) {
    if (!config.type) {
      throw new Error('Database type is required');
    }

    const supportedTypes = DatabaseFactory.getSupportedTypes();
    if (!supportedTypes.includes(config.type)) {
      throw new Error(`Unsupported database type: ${config.type}. Supported types: ${supportedTypes.join(', ')}`);
    }

    // Type-specific validation
    switch (config.type) {
      case 'sqlite':
        // SQLite can work with default path, so no strict validation needed
        break;
      
      case 'postgres':
        if (!config.host || !config.database || !config.user) {
          throw new Error('PostgreSQL requires host, database, and user');
        }
        break;
      
      case 'mongodb':
        if (!config.url) {
          throw new Error('MongoDB requires url');
        }
        break;
      
      case 'mysql':
        if (!config.host || !config.database || !config.user) {
          throw new Error('MySQL requires host, database, and user');
        }
        break;
    }
  }
}