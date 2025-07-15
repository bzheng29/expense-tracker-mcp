/**
 * MCP Tool Handlers
 * 
 * This module contains the implementation of all MCP tools.
 * Each handler is responsible for processing tool requests and returning results.
 */

import { buildCategoryTree, categoryTreeToMarkdown, calculatePeriodDates, validateTransaction, formatExportData, generateId, formatDate } from '../utils/helpers.js';

export class ToolHandlers {
  constructor(database) {
    this.db = database;
  }

  async handleGetAccountData(args) {
    const { data_type, filters = {} } = args;
    
    switch (data_type) {
      case 'profile': {
        const profile = await this.db.getUser();
        return {
          content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }]
        };
      }
      
      case 'categories': {
        const categories = await this.db.getCategories(filters);
        const tree = buildCategoryTree(categories);
        const markdown = categoryTreeToMarkdown(tree);
        
        return {
          content: [{
            type: 'text',
            text: `# Categories\n\n${markdown}\n\n## Raw Data\n\n${JSON.stringify(categories, null, 2)}`
          }]
        };
      }
      
      case 'ledgers': {
        const ledgers = await this.db.getLedgers(filters);
        return {
          content: [{ type: 'text', text: JSON.stringify(ledgers, null, 2) }]
        };
      }
      
      case 'budgets': {
        const budgets = await this.db.getBudgets(filters);
        return {
          content: [{ type: 'text', text: JSON.stringify(budgets, null, 2) }]
        };
      }
      
      default:
        throw new Error(`Unknown data_type: ${data_type}`);
    }
  }

  async handleQueryTransactions(args) {
    const result = await this.db.queryTransactions(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleAnalyzeSpending(args) {
    const result = await this.db.analyzeSpending(args.analysis_type, args.period, args.filters);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleGetSummary(args) {
    const { summary_type, period = 'this_month', date_range, include_details = false } = args;
    const result = await this.db.getSummary(summary_type, period, date_range, include_details);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleGetRecordDetails(args) {
    const { record_type, record_id, include_related = false } = args;
    const result = await this.db.getRecordDetails(record_type, record_id, include_related);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleGetInsightsData(args) {
    const { data_scope, period, include_components = {} } = args;
    const result = await this.db.getInsightsData(data_scope, period, include_components);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleBatchCreateTransactions(args) {
    const { transactions, validate_only = false } = args;
    const result = await this.db.batchCreateTransactions(transactions, validate_only);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async handleExportData(args) {
    const { export_type, format, filters = {}, options = {} } = args;
    const result = await this.db.exportData(export_type, filters, options);
    
    const formattedResult = formatExportData(result, format, options);
    
    return {
      content: [{ type: 'text', text: formattedResult }]
    };
  }

  async handleToolRequest(toolName, args) {
    try {
      switch (toolName) {
        case 'get_account_data':
          return await this.handleGetAccountData(args);
        
        case 'query_transactions':
          return await this.handleQueryTransactions(args);
        
        case 'analyze_spending':
          return await this.handleAnalyzeSpending(args);
        
        case 'get_summary':
          return await this.handleGetSummary(args);
        
        case 'get_record_details':
          return await this.handleGetRecordDetails(args);
        
        case 'get_insights_data':
          return await this.handleGetInsightsData(args);
        
        case 'batch_create_transactions':
          return await this.handleBatchCreateTransactions(args);
        
        case 'export_data':
          return await this.handleExportData(args);
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }]
      };
    }
  }
}