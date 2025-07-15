/**
 * Database Interface
 * 
 * Abstract interface for database operations that any database adapter must implement.
 * This allows for easy switching between different database backends (SQLite, PostgreSQL, MongoDB, etc.)
 */

export class DatabaseInterface {
  /**
   * Initialize the database connection and create tables if needed
   */
  async initialize() {
    throw new Error('initialize() must be implemented by database adapter');
  }

  /**
   * Close the database connection
   */
  async close() {
    throw new Error('close() must be implemented by database adapter');
  }

  /**
   * Execute a single query and return one result
   * @param {string} query - The query string
   * @param {Array} params - Query parameters
   * @returns {Object|null} Single result object or null
   */
  async get(query, params = []) {
    throw new Error('get() must be implemented by database adapter');
  }

  /**
   * Execute a query and return all results
   * @param {string} query - The query string
   * @param {Array} params - Query parameters
   * @returns {Array} Array of result objects
   */
  async all(query, params = []) {
    throw new Error('all() must be implemented by database adapter');
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   * @param {string} query - The query string
   * @param {Array} params - Query parameters
   * @returns {Object} Result object with changes info
   */
  async run(query, params = []) {
    throw new Error('run() must be implemented by database adapter');
  }

  /**
   * Start a database transaction
   * @returns {Transaction} Transaction object
   */
  async beginTransaction() {
    throw new Error('beginTransaction() must be implemented by database adapter');
  }

  /**
   * Get user account information
   * @returns {Object} User account data
   */
  async getUser() {
    throw new Error('getUser() must be implemented by database adapter');
  }

  /**
   * Get categories with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Categories array
   */
  async getCategories(filters = {}) {
    throw new Error('getCategories() must be implemented by database adapter');
  }

  /**
   * Get ledgers with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Ledgers array
   */
  async getLedgers(filters = {}) {
    throw new Error('getLedgers() must be implemented by database adapter');
  }

  /**
   * Get budgets with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Budgets array
   */
  async getBudgets(filters = {}) {
    throw new Error('getBudgets() must be implemented by database adapter');
  }

  /**
   * Query transactions with filtering, pagination, and sorting
   * @param {Object} options - Query options
   * @returns {Object} Transactions with pagination info
   */
  async queryTransactions(options = {}) {
    throw new Error('queryTransactions() must be implemented by database adapter');
  }

  /**
   * Get detailed record information
   * @param {string} recordType - Type of record (transaction, ledger_record, budget_snapshot)
   * @param {string} recordId - Record ID
   * @param {boolean} includeRelated - Whether to include related records
   * @returns {Object} Detailed record information
   */
  async getRecordDetails(recordType, recordId, includeRelated = false) {
    throw new Error('getRecordDetails() must be implemented by database adapter');
  }

  /**
   * Get insights data for AI analysis
   * @param {string} dataScope - Scope of data analysis
   * @param {Object} period - Time period configuration
   * @param {Object} includeComponents - Optional components to include
   * @returns {Object} Comprehensive insights data
   */
  async getInsightsData(dataScope, period, includeComponents = {}) {
    throw new Error('getInsightsData() must be implemented by database adapter');
  }

  /**
   * Create multiple transactions in batch
   * @param {Array} transactions - Array of transaction objects
   * @param {boolean} validateOnly - Whether to only validate without creating
   * @returns {Object} Results and errors
   */
  async batchCreateTransactions(transactions, validateOnly = false) {
    throw new Error('batchCreateTransactions() must be implemented by database adapter');
  }

  /**
   * Export data in various formats
   * @param {string} exportType - Type of export (transactions, summary_report, full_backup)
   * @param {Object} filters - Export filters
   * @param {Object} options - Export options
   * @returns {Object} Export data
   */
  async exportData(exportType, filters = {}, options = {}) {
    throw new Error('exportData() must be implemented by database adapter');
  }

  /**
   * Analyze spending patterns
   * @param {string} analysisType - Type of analysis
   * @param {Object} period - Time period
   * @param {Object} filters - Analysis filters
   * @returns {Object} Analysis results
   */
  async analyzeSpending(analysisType, period, filters = {}) {
    throw new Error('analyzeSpending() must be implemented by database adapter');
  }

  /**
   * Get summary data for different time periods
   * @param {string} summaryType - Type of summary
   * @param {string} period - Time period
   * @param {Object} dateRange - Custom date range
   * @param {boolean} includeDetails - Whether to include detailed breakdown
   * @returns {Object} Summary data
   */
  async getSummary(summaryType, period, dateRange = null, includeDetails = false) {
    throw new Error('getSummary() must be implemented by database adapter');
  }
}