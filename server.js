#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'expense_tracker.db');
const db = new sqlite3.Database(dbPath);

const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

async function initDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      default_currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      parent_id TEXT,
      description TEXT,
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('checking', 'savings', 'credit', 'cash', 'investment')) NOT NULL,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT CHECK(period IN ('monthly', 'weekly', 'yearly')) DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT,
      active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
    )
  `);


  const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await dbRun("INSERT INTO users (name, email) VALUES ('Default User', 'user@example.com')");

    const categories = [
      { id: 'food', name: 'Food & Dining', type: 'expense', parent_id: null },
      { id: 'groceries', name: 'Groceries', type: 'expense', parent_id: 'food' },
      { id: 'restaurants', name: 'Restaurants', type: 'expense', parent_id: 'food' },
      { id: 'transport', name: 'Transportation', type: 'expense', parent_id: null },
      { id: 'gas', name: 'Gas & Fuel', type: 'expense', parent_id: 'transport' },
      { id: 'public_transport', name: 'Public Transport', type: 'expense', parent_id: 'transport' },
      { id: 'entertainment', name: 'Entertainment', type: 'expense', parent_id: null },
      { id: 'movies', name: 'Movies & Shows', type: 'expense', parent_id: 'entertainment' },
      { id: 'utilities', name: 'Utilities', type: 'expense', parent_id: null },
      { id: 'electricity', name: 'Electricity', type: 'expense', parent_id: 'utilities' },
      { id: 'internet', name: 'Internet', type: 'expense', parent_id: 'utilities' },
      { id: 'salary', name: 'Salary', type: 'income', parent_id: null },
      { id: 'freelance', name: 'Freelance', type: 'income', parent_id: null },
      { id: 'investment', name: 'Investment Returns', type: 'income', parent_id: null }
    ];

    for (const cat of categories) {
      await dbRun(
        "INSERT INTO categories (id, name, type, parent_id, description) VALUES (?, ?, ?, ?, ?)",
        [cat.id, cat.name, cat.type, cat.parent_id, cat.description || null]
      );
    }

    const ledgers = [
      { id: 'checking', name: 'Primary Checking', type: 'checking', balance: 2500.00 },
      { id: 'savings', name: 'Savings Account', type: 'savings', balance: 15000.00 },
      { id: 'credit', name: 'Credit Card', type: 'credit', balance: -850.00 },
      { id: 'cash', name: 'Cash Wallet', type: 'cash', balance: 125.00 }
    ];

    for (const ledger of ledgers) {
      await dbRun(
        "INSERT INTO ledgers (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)",
        [ledger.id, ledger.name, ledger.type, ledger.balance, 'USD']
      );
    }

    const budgets = [
      { id: 'budget_food', category_id: 'food', amount: 800.00, period: 'monthly', start_date: '2024-01-01' },
      { id: 'budget_transport', category_id: 'transport', amount: 300.00, period: 'monthly', start_date: '2024-01-01' },
      { id: 'budget_entertainment', category_id: 'entertainment', amount: 200.00, period: 'monthly', start_date: '2024-01-01' },
      { id: 'budget_utilities', category_id: 'utilities', amount: 400.00, period: 'monthly', start_date: '2024-01-01' }
    ];

    for (const budget of budgets) {
      await dbRun(
        "INSERT INTO budgets (id, category_id, amount, period, start_date) VALUES (?, ?, ?, ?, ?)",
        [budget.id, budget.category_id, budget.amount, budget.period, budget.start_date]
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const sampleTransactions = [
      { id: 'txn_001', type: 'expense', amount: 45.99, category_id: 'groceries', ledger_id: 'checking', description: 'Weekly grocery shopping', date: `${currentMonth}-05`, tags: 'weekly,essential' },
      { id: 'txn_002', type: 'expense', amount: 25.50, category_id: 'gas', ledger_id: 'credit', description: 'Gas station fill-up', date: `${currentMonth}-06`, tags: 'fuel' },
      { id: 'txn_003', type: 'income', amount: 3500.00, category_id: 'salary', ledger_id: 'checking', description: 'Monthly salary deposit', date: `${currentMonth}-01`, tags: 'monthly,salary' },
      { id: 'txn_004', type: 'expense', amount: 89.99, category_id: 'electricity', ledger_id: 'checking', description: 'Monthly electricity bill', date: `${currentMonth}-03`, tags: 'monthly,utility' },
      { id: 'txn_005', type: 'expense', amount: 12.50, category_id: 'movies', ledger_id: 'cash', description: 'Movie theater tickets', date: `${currentMonth}-08`, tags: 'entertainment' },
      { id: 'txn_006', type: 'expense', amount: 67.34, category_id: 'restaurants', ledger_id: 'credit', description: 'Dinner at Italian restaurant', date: `${currentMonth}-10`, tags: 'dining,date' },
      { id: 'txn_007', type: 'income', amount: 750.00, category_id: 'freelance', ledger_id: 'checking', description: 'Website design project', date: `${currentMonth}-12`, tags: 'freelance,project' },
      { id: 'txn_008', type: 'expense', amount: 19.99, category_id: 'public_transport', ledger_id: 'checking', description: 'Monthly transit pass', date: `${currentMonth}-02`, tags: 'monthly,transport' }
    ];

    for (const txn of sampleTransactions) {
      await dbRun(
        "INSERT INTO transactions (id, type, amount, category_id, ledger_id, description, date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [txn.id, txn.type, txn.amount, txn.category_id, txn.ledger_id, txn.description, txn.date, txn.tags]
      );
    }


    console.error('Database initialized with sample data');
  }
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
}

function buildCategoryTree(categories) {
  const tree = {};
  const roots = [];
  
  categories.forEach(cat => {
    tree[cat.id] = { ...cat, children: [] };
  });
  
  categories.forEach(cat => {
    if (cat.parent_id && tree[cat.parent_id]) {
      tree[cat.parent_id].children.push(tree[cat.id]);
    } else {
      roots.push(tree[cat.id]);
    }
  });
  
  return roots;
}

function categoryTreeToMarkdown(categories, level = 0) {
  let markdown = '';
  const indent = '  '.repeat(level);
  
  categories.forEach(cat => {
    markdown += `${indent}- ${cat.name} (${cat.id})\n`;
    if (cat.children && cat.children.length > 0) {
      markdown += categoryTreeToMarkdown(cat.children, level + 1);
    }
  });
  
  return markdown;
}

const server = new Server(
  {
    name: 'expense-tracker',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'get_account_data': {
        const { data_type, filters = {} } = args;
        
        switch (data_type) {
          case 'profile': {
            const profile = await dbGet('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');
            return {
              content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }]
            };
          }
          
          case 'categories': {
            let query = 'SELECT * FROM categories';
            const params = [];
            
            if (filters.active_only) {
              query += ' WHERE active = 1';
            }
            
            query += ' ORDER BY type, name';
            
            const categories = await dbAll(query, params);
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
            let query = 'SELECT * FROM ledgers';
            const params = [];
            
            if (filters.active_only) {
              query += ' WHERE active = 1';
            }
            
            if (filters.ledger_ids && filters.ledger_ids.length > 0) {
              const whereClause = filters.active_only ? ' AND' : ' WHERE';
              query += `${whereClause} id IN (${filters.ledger_ids.map(() => '?').join(',')})`;
              params.push(...filters.ledger_ids);
            }
            
            query += ' ORDER BY name';
            
            const ledgers = await dbAll(query, params);
            return {
              content: [{ type: 'text', text: JSON.stringify(ledgers, null, 2) }]
            };
          }
          
          case 'budgets': {
            let query = `
              SELECT b.*, c.name as category_name, c.type as category_type
              FROM budgets b
              JOIN categories c ON b.category_id = c.id
            `;
            
            if (filters.active_only) {
              query += ' WHERE b.active = 1';
            }
            
            query += ' ORDER BY b.period, c.name';
            
            const budgets = await dbAll(query);
            return {
              content: [{ type: 'text', text: JSON.stringify(budgets, null, 2) }]
            };
          }
          
          default:
            throw new Error(`Unknown data_type: ${data_type}`);
        }
      }

      case 'query_transactions': {
        const { type = 'all', filters = {}, pagination = {}, sort = {} } = args;
        
        let query = `
          SELECT t.*, c.name as category_name, c.type as category_type, l.name as ledger_name
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          JOIN ledgers l ON t.ledger_id = l.id
        `;
        
        const conditions = [];
        const params = [];
        
        if (type !== 'all') {
          conditions.push('t.type = ?');
          params.push(type);
        }
        
        if (filters.date_start) {
          conditions.push('t.date >= ?');
          params.push(filters.date_start);
        }
        
        if (filters.date_end) {
          conditions.push('t.date <= ?');
          params.push(filters.date_end);
        }
        
        if (filters.categories && filters.categories.length > 0) {
          conditions.push(`t.category_id IN (${filters.categories.map(() => '?').join(',')})`);
          params.push(...filters.categories);
        }
        
        if (filters.ledgers && filters.ledgers.length > 0) {
          conditions.push(`t.ledger_id IN (${filters.ledgers.map(() => '?').join(',')})`);
          params.push(...filters.ledgers);
        }
        
        if (filters.search_text) {
          conditions.push('t.description LIKE ?');
          params.push(`%${filters.search_text}%`);
        }
        
        if (filters.min_amount !== undefined) {
          conditions.push('t.amount >= ?');
          params.push(filters.min_amount);
        }
        
        if (filters.max_amount !== undefined) {
          conditions.push('t.amount <= ?');
          params.push(filters.max_amount);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        if (sort.field) {
          const sortField = sort.field === 'category' ? 'c.name' : 
                           sort.field === 'date' ? 't.date' : 't.amount';
          query += ` ORDER BY ${sortField} ${sort.order || 'desc'}`;
        } else {
          query += ' ORDER BY t.date DESC';
        }
        
        const { page = 1, limit = 50 } = pagination;
        const actualLimit = Math.min(limit, 100);
        const offset = (page - 1) * actualLimit;
        
        const countQuery = query.replace(/SELECT t\.\*, c\.name as category_name, c\.type as category_type, l\.name as ledger_name/, 'SELECT COUNT(*) as count');
        const totalCount = await dbGet(countQuery, params);
        
        query += ` LIMIT ? OFFSET ?`;
        params.push(actualLimit, offset);
        
        const transactions = await dbAll(query, params);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              transactions,
              pagination: {
                page,
                limit: actualLimit,
                total: totalCount.count,
                has_next: (page * actualLimit) < totalCount.count
              }
            }, null, 2)
          }]
        };
      }

      case 'analyze_spending': {
        const { analysis_type, period, filters = {} } = args;
        
        switch (analysis_type) {
          case 'category_breakdown': {
            let query = `
              SELECT c.name as category, c.id as category_id, c.type,
                     SUM(t.amount) as total_amount,
                     COUNT(t.id) as transaction_count,
                     AVG(t.amount) as avg_amount
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ?
            `;
            
            const params = [period.start, period.end];
            
            if (filters.transaction_type) {
              query += ' AND t.type = ?';
              params.push(filters.transaction_type);
            }
            
            if (filters.categories && filters.categories.length > 0) {
              query += ` AND t.category_id IN (${filters.categories.map(() => '?').join(',')})`;
              params.push(...filters.categories);
            }
            
            query += ' GROUP BY c.id, c.name, c.type ORDER BY total_amount DESC';
            
            const breakdown = await dbAll(query, params);
            const total = breakdown.reduce((sum, item) => sum + item.total_amount, 0);
            
            const result = breakdown.map(item => ({
              ...item,
              percentage: total > 0 ? (item.total_amount / total * 100).toFixed(2) : 0
            }));
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ breakdown: result, total_amount: total }, null, 2)
              }]
            };
          }
          
          case 'time_trend': {
            const { grouping = 'month' } = period;
            
            let dateFormat;
            switch (grouping) {
              case 'day': dateFormat = '%Y-%m-%d'; break;
              case 'week': dateFormat = '%Y-%W'; break;
              case 'month': dateFormat = '%Y-%m'; break;
              default: dateFormat = '%Y-%m';
            }
            
            let query = `
              SELECT strftime('${dateFormat}', t.date) as period,
                     SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses,
                     SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
                     COUNT(t.id) as transaction_count
              FROM transactions t
              WHERE t.date >= ? AND t.date <= ?
            `;
            
            const params = [period.start, period.end];
            
            if (filters.transaction_type) {
              query += ' AND t.type = ?';
              params.push(filters.transaction_type);
            }
            
            query += ' GROUP BY period ORDER BY period';
            
            const trends = await dbAll(query, params);
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ trends, grouping }, null, 2)
              }]
            };
          }
          
          case 'budget_variance': {
            const query = `
              SELECT b.id as budget_id, b.amount as budgeted_amount, b.period,
                     c.name as category_name, c.id as category_id,
                     COALESCE(SUM(t.amount), 0) as actual_amount
              FROM budgets b
              JOIN categories c ON b.category_id = c.id
              LEFT JOIN transactions t ON t.category_id = c.id 
                AND t.date >= ? AND t.date <= ?
                AND t.type = 'expense'
              WHERE b.active = 1
              GROUP BY b.id, b.amount, b.period, c.name, c.id
            `;
            
            const variances = await dbAll(query, [period.start, period.end]);
            
            const result = variances.map(item => ({
              ...item,
              variance: item.actual_amount - item.budgeted_amount,
              variance_percentage: item.budgeted_amount > 0 ? 
                ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount * 100).toFixed(2) : 0,
              status: item.actual_amount > item.budgeted_amount ? 'over' : 'under'
            }));
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ variances: result, period }, null, 2)
              }]
            };
          }
          
          default:
            throw new Error(`Unknown analysis_type: ${analysis_type}`);
        }
      }

      case 'get_summary': {
        const { summary_type, period = 'this_month', date_range, include_details = false } = args;
        
        let startDate, endDate;
        const now = new Date();
        
        switch (period) {
          case 'today':
            startDate = endDate = now.toISOString().slice(0, 10);
            break;
          case 'this_week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = weekStart.toISOString().slice(0, 10);
            endDate = now.toISOString().slice(0, 10);
            break;
          case 'this_month':
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            endDate = now.toISOString().slice(0, 10);
            break;
          case 'this_year':
            startDate = `${now.getFullYear()}-01-01`;
            endDate = now.toISOString().slice(0, 10);
            break;
          case 'custom':
            if (!date_range) throw new Error('date_range required for custom period');
            startDate = date_range.start;
            endDate = date_range.end;
            break;
          default:
            throw new Error(`Unknown period: ${period}`);
        }
        
        switch (summary_type) {
          case 'period_totals': {
            const totals = await dbGet(`
              SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
                COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
                COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
              FROM transactions
              WHERE date >= ? AND date <= ?
            `, [startDate, endDate]);
            
            const result = {
              ...totals,
              net_amount: totals.total_income - totals.total_expenses,
              period: { start: startDate, end: endDate, type: period }
            };
            
            if (include_details) {
              const breakdown = await dbAll(`
                SELECT c.name as category, c.type,
                       SUM(t.amount) as amount,
                       COUNT(t.id) as count
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.date >= ? AND t.date <= ?
                GROUP BY c.id, c.name, c.type
                ORDER BY c.type, amount DESC
              `, [startDate, endDate]);
              
              result.category_breakdown = breakdown;
            }
            
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
          
          case 'budget_status': {
            const budgets = await dbAll(`
              SELECT b.*, c.name as category_name,
                     COALESCE(SUM(t.amount), 0) as spent_amount
              FROM budgets b
              JOIN categories c ON b.category_id = c.id
              LEFT JOIN transactions t ON t.category_id = c.id 
                AND t.date >= ? AND t.date <= ?
                AND t.type = 'expense'
              WHERE b.active = 1
              GROUP BY b.id
            `, [startDate, endDate]);
            
            const result = budgets.map(budget => ({
              ...budget,
              remaining: budget.amount - budget.spent_amount,
              percentage_used: budget.amount > 0 ? (budget.spent_amount / budget.amount * 100).toFixed(2) : 0,
              status: budget.spent_amount > budget.amount ? 'over' : 'under'
            }));
            
            return {
              content: [{ type: 'text', text: JSON.stringify({
                budgets: result,
                period: { start: startDate, end: endDate, type: period }
              }, null, 2) }]
            };
          }
          
          case 'quick_stats': {
            const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
            
            const stats = await dbGet(`
              SELECT 
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_transactions,
                AVG(CASE WHEN type = 'expense' THEN amount END) as avg_expense,
                MAX(CASE WHEN type = 'expense' THEN amount END) as max_expense
              FROM transactions
              WHERE date >= ? AND date <= ?
            `, [startDate, endDate]);
            
            const topCategory = await dbGet(`
              SELECT c.name as category, SUM(t.amount) as total
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY c.id, c.name
              ORDER BY total DESC
              LIMIT 1
            `, [startDate, endDate]);
            
            const result = {
              ...stats,
              daily_avg_expense: stats.total_expenses / days,
              top_expense_category: topCategory,
              period: { start: startDate, end: endDate, type: period, days }
            };
            
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
          
          default:
            throw new Error(`Unknown summary_type: ${summary_type}`);
        }
      }

      case 'get_record_details': {
        const { record_type, record_id, include_related = false } = args;
        
        switch (record_type) {
          case 'transaction': {
            const transaction = await dbGet(`
              SELECT t.*, c.name as category_name, c.type as category_type, 
                     l.name as ledger_name, l.type as ledger_type
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              JOIN ledgers l ON t.ledger_id = l.id
              WHERE t.id = ?
            `, [record_id]);
            
            if (!transaction) {
              throw new Error(`Transaction not found: ${record_id}`);
            }
            
            const result = { transaction };
            
            if (include_related) {
              const relatedTransactions = await dbAll(`
                SELECT t.*, c.name as category_name
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.category_id = ? AND t.id != ?
                ORDER BY t.date DESC
                LIMIT 5
              `, [transaction.category_id, record_id]);
              
              result.related_transactions = relatedTransactions;
            }
            
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
          
          case 'ledger_record': {
            const ledger = await dbGet('SELECT * FROM ledgers WHERE id = ?', [record_id]);
            
            if (!ledger) {
              throw new Error(`Ledger not found: ${record_id}`);
            }
            
            const result = { ledger };
            
            if (include_related) {
              const recentTransactions = await dbAll(`
                SELECT t.*, c.name as category_name
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.ledger_id = ?
                ORDER BY t.date DESC
                LIMIT 10
              `, [record_id]);
              
              result.recent_transactions = recentTransactions;
            }
            
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
          
          case 'budget_snapshot': {
            const budget = await dbGet(`
              SELECT b.*, c.name as category_name, c.type as category_type
              FROM budgets b
              JOIN categories c ON b.category_id = c.id
              WHERE b.id = ?
            `, [record_id]);
            
            if (!budget) {
              throw new Error(`Budget not found: ${record_id}`);
            }
            
            const result = { budget };
            
            if (include_related) {
              const currentMonth = new Date().toISOString().slice(0, 7);
              const monthlySpending = await dbAll(`
                SELECT DATE(t.date) as date, SUM(t.amount) as daily_total
                FROM transactions t
                WHERE t.category_id = ? AND t.type = 'expense'
                  AND t.date >= ? AND t.date <= ?
                GROUP BY DATE(t.date)
                ORDER BY t.date DESC
              `, [budget.category_id, `${currentMonth}-01`, `${currentMonth}-31`]);
              
              result.monthly_spending = monthlySpending;
            }
            
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
          
          default:
            throw new Error(`Unknown record_type: ${record_type}`);
        }
      }

      case 'get_insights_data': {
        const { data_scope, period, include_components = {} } = args;
        const { current, comparison } = period;
        
        let result = {
          data_scope,
          period,
          analysis_data: {},
          generated_at: new Date().toISOString()
        };
        
        switch (data_scope) {
          case 'spending_patterns': {
            // Current period spending by category
            const currentSpending = await dbAll(`
              SELECT c.name as category, c.id as category_id, c.type,
                     SUM(t.amount) as total_amount,
                     COUNT(t.id) as transaction_count,
                     AVG(t.amount) as avg_amount,
                     MIN(t.amount) as min_amount,
                     MAX(t.amount) as max_amount,
                     strftime('%w', t.date) as day_of_week
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY c.id, c.name, c.type
              ORDER BY total_amount DESC
            `, [current.start, current.end]);
            
            result.analysis_data.current_spending = currentSpending;
            
            // Comparison period if provided
            if (comparison) {
              const comparisonSpending = await dbAll(`
                SELECT c.name as category, c.id as category_id, c.type,
                       SUM(t.amount) as total_amount,
                       COUNT(t.id) as transaction_count,
                       AVG(t.amount) as avg_amount
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                GROUP BY c.id, c.name, c.type
                ORDER BY total_amount DESC
              `, [comparison.start, comparison.end]);
              
              result.analysis_data.comparison_spending = comparisonSpending;
              
              // Calculate changes
              const changes = currentSpending.map(curr => {
                const prev = comparisonSpending.find(p => p.category_id === curr.category_id);
                if (prev) {
                  return {
                    category: curr.category,
                    current_amount: curr.total_amount,
                    previous_amount: prev.total_amount,
                    change_amount: curr.total_amount - prev.total_amount,
                    change_percentage: prev.total_amount > 0 ? 
                      ((curr.total_amount - prev.total_amount) / prev.total_amount * 100).toFixed(2) : 0
                  };
                }
                return {
                  category: curr.category,
                  current_amount: curr.total_amount,
                  previous_amount: 0,
                  change_amount: curr.total_amount,
                  change_percentage: 100
                };
              });
              
              result.analysis_data.spending_changes = changes;
            }
            
            // Daily spending patterns
            const dailySpending = await dbAll(`
              SELECT DATE(t.date) as date,
                     SUM(t.amount) as daily_total,
                     COUNT(t.id) as transaction_count,
                     strftime('%w', t.date) as day_of_week
              FROM transactions t
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY DATE(t.date)
              ORDER BY t.date
            `, [current.start, current.end]);
            
            result.analysis_data.daily_patterns = dailySpending;
            
            // Frequency patterns
            const frequencyData = await dbAll(`
              SELECT c.name as category,
                     COUNT(t.id) as frequency,
                     AVG(t.amount) as avg_amount,
                     SUM(t.amount) as total_amount
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY c.id, c.name
              HAVING frequency > 1
              ORDER BY frequency DESC
            `, [current.start, current.end]);
            
            result.analysis_data.frequency_patterns = frequencyData;
            break;
          }
          
          case 'budget_analysis': {
            // Budget vs actual analysis
            const budgetAnalysis = await dbAll(`
              SELECT b.*, c.name as category_name,
                     COALESCE(SUM(t.amount), 0) as actual_spent,
                     b.amount - COALESCE(SUM(t.amount), 0) as remaining,
                     CASE 
                       WHEN b.amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.amount * 100)
                       ELSE 0
                     END as percentage_used
              FROM budgets b
              JOIN categories c ON b.category_id = c.id
              LEFT JOIN transactions t ON t.category_id = c.id 
                AND t.date >= ? AND t.date <= ?
                AND t.type = 'expense'
              WHERE b.active = 1
              GROUP BY b.id
              ORDER BY percentage_used DESC
            `, [current.start, current.end]);
            
            result.analysis_data.budget_performance = budgetAnalysis;
            
            // Budget adherence over time
            const budgetTrends = await dbAll(`
              SELECT DATE(t.date) as date,
                     c.name as category,
                     SUM(t.amount) as daily_spent,
                     b.amount as budget_amount
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              JOIN budgets b ON b.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                AND b.active = 1
              GROUP BY DATE(t.date), c.id, c.name, b.amount
              ORDER BY t.date, c.name
            `, [current.start, current.end]);
            
            result.analysis_data.budget_trends = budgetTrends;
            
            // Forecast based on current spending rate
            const daysInPeriod = Math.ceil((new Date(current.end) - new Date(current.start)) / (1000 * 60 * 60 * 24)) + 1;
            const forecasts = budgetAnalysis.map(b => ({
              category: b.category_name,
              budget_amount: b.amount,
              actual_spent: b.actual_spent,
              daily_rate: b.actual_spent / daysInPeriod,
              projected_monthly: (b.actual_spent / daysInPeriod) * 30,
              forecast_status: (b.actual_spent / daysInPeriod) * 30 > b.amount ? 'over_budget' : 'on_track'
            }));
            
            result.analysis_data.spending_forecasts = forecasts;
            break;
          }
          
          case 'anomaly_detection': {
            // Statistical outliers - transactions significantly above average
            const averagesByCategory = await dbAll(`
              SELECT c.name as category,
                     AVG(t.amount) as avg_amount,
                     (AVG(t.amount) * 2) as outlier_threshold
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.type = 'expense'
              GROUP BY c.id, c.name
            `);
            
            result.analysis_data.category_averages = averagesByCategory;
            
            // Find outlier transactions
            const outliers = await dbAll(`
              SELECT t.*, c.name as category_name,
                     (SELECT AVG(amount) FROM transactions t2 WHERE t2.category_id = t.category_id) as category_avg
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                AND t.amount > (SELECT AVG(amount) * 2 FROM transactions t2 WHERE t2.category_id = t.category_id)
              ORDER BY t.amount DESC
            `, [current.start, current.end]);
            
            result.analysis_data.outlier_transactions = outliers;
            
            // Unusual spending spikes by day
            const dailySpikes = await dbAll(`
              SELECT DATE(t.date) as date,
                     SUM(t.amount) as daily_total,
                     (SELECT AVG(daily_sum) FROM (
                       SELECT SUM(amount) as daily_sum
                       FROM transactions 
                       WHERE type = 'expense' AND date < ?
                       GROUP BY DATE(date)
                     )) as historical_daily_avg
              FROM transactions t
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY DATE(t.date)
              HAVING daily_total > historical_daily_avg * 1.5
              ORDER BY daily_total DESC
            `, [current.start, current.start, current.end]);
            
            result.analysis_data.spending_spikes = dailySpikes;
            
            // Unusual patterns - new merchants/categories
            const newMerchants = await dbAll(`
              SELECT t.description, COUNT(*) as frequency, SUM(t.amount) as total
              FROM transactions t
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                AND t.description NOT IN (
                  SELECT DISTINCT description 
                  FROM transactions 
                  WHERE date < ? AND type = 'expense'
                )
              GROUP BY t.description
              ORDER BY total DESC
            `, [current.start, current.end, current.start]);
            
            result.analysis_data.new_merchants = newMerchants;
            break;
          }
          
          case 'savings_potential': {
            // Recurring charges analysis
            const recurringCharges = await dbAll(`
              SELECT t.description, 
                     COUNT(*) as frequency,
                     AVG(t.amount) as avg_amount,
                     SUM(t.amount) as total_amount,
                     c.name as category
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.type = 'expense'
              GROUP BY t.description, c.name
              HAVING frequency >= 2
              ORDER BY total_amount DESC
            `);
            
            result.analysis_data.recurring_charges = recurringCharges;
            
            // Category comparison with potential savings
            const categoryAnalysis = await dbAll(`
              SELECT c.name as category,
                     SUM(t.amount) as total_spent,
                     COUNT(t.id) as transaction_count,
                     AVG(t.amount) as avg_transaction,
                     MAX(t.amount) as max_transaction
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
              GROUP BY c.id, c.name
              ORDER BY total_spent DESC
            `, [current.start, current.end]);
            
            result.analysis_data.category_analysis = categoryAnalysis;
            
            // High-frequency low-value transactions (potential for consolidation)
            const microTransactions = await dbAll(`
              SELECT c.name as category,
                     COUNT(*) as frequency,
                     SUM(t.amount) as total_amount,
                     AVG(t.amount) as avg_amount
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                AND t.amount < 20
              GROUP BY c.id, c.name
              HAVING frequency >= 5
              ORDER BY total_amount DESC
            `, [current.start, current.end]);
            
            result.analysis_data.micro_transactions = microTransactions;
            
            // Subscription and service analysis
            const subscriptionKeywords = ['subscription', 'monthly', 'annual', 'service', 'premium', 'plus'];
            const keywordPattern = subscriptionKeywords.map(() => 'LOWER(t.description) LIKE ?').join(' OR ');
            const keywordParams = subscriptionKeywords.map(keyword => `%${keyword}%`);
            
            const subscriptionAnalysis = await dbAll(`
              SELECT t.description,
                     COUNT(*) as frequency,
                     AVG(t.amount) as avg_amount,
                     SUM(t.amount) as total_amount,
                     c.name as category
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ? AND t.type = 'expense'
                AND (${keywordPattern})
              GROUP BY t.description, c.name
              ORDER BY total_amount DESC
            `, [current.start, current.end, ...keywordParams]);
            
            result.analysis_data.potential_subscriptions = subscriptionAnalysis;
            break;
          }
        }
        
        // Add optional components
        if (include_components.transactions) {
          const sampleTransactions = await dbAll(`
            SELECT t.*, c.name as category_name, l.name as ledger_name
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            JOIN ledgers l ON t.ledger_id = l.id
            WHERE t.date >= ? AND t.date <= ?
            ORDER BY t.date DESC
            LIMIT 20
          `, [current.start, current.end]);
          
          result.analysis_data.sample_transactions = sampleTransactions;
        }
        
        if (include_components.statistics) {
          const statistics = await dbGet(`
            SELECT 
              SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
              SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
              COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
              COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
              AVG(CASE WHEN type = 'expense' THEN amount END) as avg_expense,
              MAX(CASE WHEN type = 'expense' THEN amount END) as max_expense,
              MIN(CASE WHEN type = 'expense' THEN amount END) as min_expense
            FROM transactions
            WHERE date >= ? AND date <= ?
          `, [current.start, current.end]);
          
          result.analysis_data.period_statistics = statistics;
        }
        
        if (include_components.historical_averages) {
          const historicalAverages = await dbAll(`
            SELECT c.name as category,
                   AVG(t.amount) as historical_avg,
                   COUNT(t.id) as historical_count
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.date < ? AND t.type = 'expense'
            GROUP BY c.id, c.name
            ORDER BY historical_avg DESC
          `, [current.start]);
          
          result.analysis_data.historical_averages = historicalAverages;
        }
        
        if (include_components.peer_comparison) {
          // Mock peer data - in real implementation this would come from anonymized aggregate data
          result.analysis_data.peer_comparison = {
            note: "Peer comparison data not available in this implementation",
            mock_data: {
              avg_monthly_expenses: 2800,
              common_categories: ["Food", "Transportation", "Utilities", "Entertainment"],
              typical_ranges: {
                "Food": { min: 400, max: 800 },
                "Transportation": { min: 200, max: 500 },
                "Utilities": { min: 150, max: 400 }
              }
            }
          };
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      case 'batch_create_transactions': {
        const { transactions, validate_only = false } = args;
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < transactions.length; i++) {
          const txn = transactions[i];
          
          try {
            const category = await dbGet('SELECT * FROM categories WHERE id = ?', [txn.category]);
            if (!category) {
              throw new Error(`Category not found: ${txn.category}`);
            }
            
            const ledger_id = txn.ledger_id || 'checking';
            const ledger = await dbGet('SELECT * FROM ledgers WHERE id = ?', [ledger_id]);
            if (!ledger) {
              throw new Error(`Ledger not found: ${ledger_id}`);
            }
            
            if (validate_only) {
              results.push({
                index: i,
                status: 'valid',
                transaction: txn
              });
            } else {
              const transaction_id = generateId('txn');
              const tags = txn.tags ? txn.tags.join(',') : '';
              
              await dbRun(`
                INSERT INTO transactions 
                (id, type, amount, category_id, ledger_id, description, date, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                transaction_id,
                txn.type,
                txn.amount,
                txn.category,
                ledger_id,
                txn.description || '',
                formatDate(txn.date),
                tags
              ]);
              
              results.push({
                index: i,
                status: 'created',
                transaction_id,
                transaction: txn
              });
            }
          } catch (error) {
            errors.push({
              index: i,
              error: error.message,
              transaction: txn
            });
          }
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            results,
            errors,
            summary: {
              total: transactions.length,
              successful: results.length,
              failed: errors.length,
              validate_only
            }
          }, null, 2) }]
        };
      }

      case 'export_data': {
        const { export_type, format, filters = {}, options = {} } = args;
        
        let data;
        
        switch (export_type) {
          case 'transactions': {
            let query = `
              SELECT t.*, c.name as category_name, c.type as category_type,
                     l.name as ledger_name, l.type as ledger_type
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              JOIN ledgers l ON t.ledger_id = l.id
            `;
            
            const conditions = [];
            const params = [];
            
            if (filters.date_start) {
              conditions.push('t.date >= ?');
              params.push(filters.date_start);
            }
            
            if (filters.date_end) {
              conditions.push('t.date <= ?');
              params.push(filters.date_end);
            }
            
            if (filters.categories && filters.categories.length > 0) {
              conditions.push(`t.category_id IN (${filters.categories.map(() => '?').join(',')})`);
              params.push(...filters.categories);
            }
            
            if (filters.ledgers && filters.ledgers.length > 0) {
              conditions.push(`t.ledger_id IN (${filters.ledgers.map(() => '?').join(',')})`);
              params.push(...filters.ledgers);
            }
            
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
            
            if (options.group_by) {
              query += ` ORDER BY ${options.group_by === 'category' ? 'c.name' : 
                                   options.group_by === 'ledger' ? 'l.name' : 't.date'}`;
            } else {
              query += ' ORDER BY t.date DESC';
            }
            
            data = await dbAll(query, params);
            break;
          }
          
          case 'summary_report': {
            const startDate = filters.date_start || '2024-01-01';
            const endDate = filters.date_end || new Date().toISOString().slice(0, 10);
            
            const totals = await dbGet(`
              SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
              FROM transactions
              WHERE date >= ? AND date <= ?
            `, [startDate, endDate]);
            
            const breakdown = await dbAll(`
              SELECT c.name as category, c.type,
                     SUM(t.amount) as amount,
                     COUNT(t.id) as transaction_count
              FROM transactions t
              JOIN categories c ON t.category_id = c.id
              WHERE t.date >= ? AND t.date <= ?
              GROUP BY c.id, c.name, c.type
              ORDER BY c.type, amount DESC
            `, [startDate, endDate]);
            
            data = {
              period: { start: startDate, end: endDate },
              totals: {
                ...totals,
                net_amount: totals.total_income - totals.total_expenses
              },
              breakdown
            };
            break;
          }
          
          case 'full_backup': {
            const tables = ['users', 'categories', 'ledgers', 'budgets', 'transactions', 'ai_insights'];
            data = {};
            
            for (const table of tables) {
              data[table] = await dbAll(`SELECT * FROM ${table}`);
            }
            
            data.exported_at = new Date().toISOString();
            data.version = '1.0.0';
            break;
          }
          
          default:
            throw new Error(`Unknown export_type: ${export_type}`);
        }
        
        switch (format) {
          case 'json':
            return {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
            };
          
          case 'csv':
            if (export_type === 'transactions') {
              const headers = ['id', 'type', 'amount', 'category_name', 'ledger_name', 'description', 'date', 'tags'];
              const csv = [headers.join(',')];
              
              data.forEach(row => {
                const values = headers.map(header => {
                  const value = row[header] || '';
                  return `"${value.toString().replace(/"/g, '""')}"`;
                });
                csv.push(values.join(','));
              });
              
              return {
                content: [{ type: 'text', text: csv.join('\n') }]
              };
            } else {
              return {
                content: [{ type: 'text', text: 'CSV format only supported for transactions export' }]
              };
            }
          
          case 'markdown':
            if (export_type === 'summary_report') {
              const { period, totals, breakdown } = data;
              
              let markdown = `# Financial Summary Report\n\n`;
              markdown += `**Period:** ${period.start} to ${period.end}\n\n`;
              markdown += `## Totals\n\n`;
              markdown += `- **Total Income:** $${totals.total_income.toFixed(2)}\n`;
              markdown += `- **Total Expenses:** $${totals.total_expenses.toFixed(2)}\n`;
              markdown += `- **Net Amount:** $${totals.net_amount.toFixed(2)}\n\n`;
              
              markdown += `## Breakdown by Category\n\n`;
              
              const incomeCategories = breakdown.filter(b => b.type === 'income');
              const expenseCategories = breakdown.filter(b => b.type === 'expense');
              
              if (incomeCategories.length > 0) {
                markdown += `### Income\n\n`;
                incomeCategories.forEach(cat => {
                  markdown += `- **${cat.category}:** $${cat.amount.toFixed(2)} (${cat.transaction_count} transactions)\n`;
                });
                markdown += '\n';
              }
              
              if (expenseCategories.length > 0) {
                markdown += `### Expenses\n\n`;
                expenseCategories.forEach(cat => {
                  markdown += `- **${cat.category}:** $${cat.amount.toFixed(2)} (${cat.transaction_count} transactions)\n`;
                });
              }
              
              return {
                content: [{ type: 'text', text: markdown }]
              };
            } else {
              return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
              };
            }
          
          default:
            throw new Error(`Unknown format: ${format}`);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }]
    };
  }
});

async function main() {
  await initDatabase();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Expense Tracker MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});