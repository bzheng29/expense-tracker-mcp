/**
 * MCP Tool Definitions
 * 
 * This module contains all the tool definitions for the expense tracker MCP server.
 * Each tool defines its schema and input validation requirements.
 */

export const toolDefinitions = [
  {
    name: 'get_account_data',
    description: 'Retrieve basic account information and configuration data',
    inputSchema: {
      type: 'object',
      properties: {
        data_type: {
          type: 'string',
          enum: ['profile', 'categories', 'ledgers', 'budgets'],
          description: 'Type of account data to retrieve'
        },
        filters: {
          type: 'object',
          properties: {
            active_only: {
              type: 'boolean',
              description: 'Only return active records'
            },
            ledger_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific ledger IDs'
            }
          }
        }
      },
      required: ['data_type']
    }
  },
  {
    name: 'query_transactions',
    description: 'Search and filter income/expense transactions with pagination support',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['expense', 'income', 'all'],
          description: 'Transaction type filter'
        },
        filters: {
          type: 'object',
          properties: {
            date_start: { type: 'string', description: 'Start date (ISO format)' },
            date_end: { type: 'string', description: 'End date (ISO format)' },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Category IDs to filter by'
            },
            ledgers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ledger IDs to filter by'
            },
            search_text: { type: 'string', description: 'Search in descriptions' },
            min_amount: { type: 'number', description: 'Minimum amount' },
            max_amount: { type: 'number', description: 'Maximum amount' }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (1-based)' },
            limit: { type: 'number', description: 'Items per page (max 100)' }
          }
        },
        sort: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              enum: ['date', 'amount', 'category'],
              description: 'Field to sort by'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order'
            }
          }
        }
      }
    }
  },
  {
    name: 'analyze_spending',
    description: 'Perform various analytical operations on transaction data',
    inputSchema: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['category_breakdown', 'time_trend', 'budget_variance'],
          description: 'Type of analysis to perform'
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date (ISO format)' },
            end: { type: 'string', description: 'End date (ISO format)' },
            grouping: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              description: 'Time grouping for trend analysis'
            }
          },
          required: ['start', 'end']
        },
        filters: {
          type: 'object',
          properties: {
            transaction_type: {
              type: 'string',
              enum: ['expense', 'income'],
              description: 'Transaction type to analyze'
            },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Category IDs to include'
            },
            ledgers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ledger IDs to include'
            }
          }
        }
      },
      required: ['analysis_type', 'period']
    }
  },
  {
    name: 'get_summary',
    description: 'Get summarized financial data for different time periods',
    inputSchema: {
      type: 'object',
      properties: {
        summary_type: {
          type: 'string',
          enum: ['period_totals', 'budget_status', 'quick_stats'],
          description: 'Type of summary to generate'
        },
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month', 'this_year', 'custom'],
          description: 'Time period for summary'
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date for custom period' },
            end: { type: 'string', description: 'End date for custom period' }
          }
        },
        include_details: {
          type: 'boolean',
          description: 'Include category breakdowns and details'
        }
      },
      required: ['summary_type']
    }
  },
  {
    name: 'get_record_details',
    description: 'Retrieve detailed information about specific records',
    inputSchema: {
      type: 'object',
      properties: {
        record_type: {
          type: 'string',
          enum: ['transaction', 'ledger_record', 'budget_snapshot'],
          description: 'Type of record to retrieve'
        },
        record_id: {
          type: 'string',
          description: 'ID of the record to retrieve'
        },
        include_related: {
          type: 'boolean',
          description: 'Include related records and metadata'
        }
      },
      required: ['record_type', 'record_id']
    }
  },
  {
    name: 'get_insights_data',
    description: 'Retrieve comprehensive data for AI analysis and insights generation',
    inputSchema: {
      type: 'object',
      properties: {
        data_scope: {
          type: 'string',
          enum: ['spending_patterns', 'budget_analysis', 'anomaly_detection', 'savings_potential'],
          description: 'Type of data analysis to prepare'
        },
        period: {
          type: 'object',
          properties: {
            current: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'Start date (ISO format)' },
                end: { type: 'string', description: 'End date (ISO format)' }
              },
              required: ['start', 'end']
            },
            comparison: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'Comparison period start date' },
                end: { type: 'string', description: 'Comparison period end date' }
              },
              required: ['start', 'end']
            }
          },
          required: ['current']
        },
        include_components: {
          type: 'object',
          properties: {
            transactions: {
              type: 'boolean',
              description: 'Include raw transaction samples'
            },
            statistics: {
              type: 'boolean',
              description: 'Include statistical measures'
            },
            historical_averages: {
              type: 'boolean',
              description: 'Include historical average comparisons'
            },
            peer_comparison: {
              type: 'boolean',
              description: 'Include anonymized peer data if available'
            }
          }
        }
      },
      required: ['data_scope', 'period']
    }
  },
  {
    name: 'batch_create_transactions',
    description: 'Efficiently create multiple transactions at once',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['expense', 'income'],
                description: 'Transaction type'
              },
              amount: {
                type: 'number',
                description: 'Transaction amount'
              },
              category: {
                type: 'string',
                description: 'Category ID'
              },
              description: {
                type: 'string',
                description: 'Transaction description'
              },
              date: {
                type: 'string',
                description: 'Transaction date (ISO format, defaults to today)'
              },
              ledger_id: {
                type: 'string',
                description: 'Ledger ID (defaults to checking)'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Transaction tags'
              }
            },
            required: ['type', 'amount', 'category']
          }
        },
        validate_only: {
          type: 'boolean',
          description: 'Perform validation only (dry run)'
        }
      },
      required: ['transactions']
    }
  },
  {
    name: 'export_data',
    description: 'Export financial data in various formats for reports or backups',
    inputSchema: {
      type: 'object',
      properties: {
        export_type: {
          type: 'string',
          enum: ['transactions', 'summary_report', 'full_backup'],
          description: 'Type of data to export'
        },
        format: {
          type: 'string',
          enum: ['json', 'csv', 'markdown'],
          description: 'Export format'
        },
        filters: {
          type: 'object',
          properties: {
            date_start: { type: 'string', description: 'Start date filter' },
            date_end: { type: 'string', description: 'End date filter' },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Category IDs to include'
            },
            ledgers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ledger IDs to include'
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            include_metadata: {
              type: 'boolean',
              description: 'Include metadata in export'
            },
            group_by: {
              type: 'string',
              enum: ['date', 'category', 'ledger'],
              description: 'Group exported data by field'
            }
          }
        }
      },
      required: ['export_type', 'format']
    }
  }
];