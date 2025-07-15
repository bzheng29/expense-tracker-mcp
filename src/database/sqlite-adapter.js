import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseInterface } from './interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SQLiteAdapter extends DatabaseInterface {
  constructor(dbPath = null) {
    super();
    this.dbPath = dbPath || path.join(__dirname, '../../expense_tracker.db');
    this.db = null;
    this.dbGet = null;
    this.dbAll = null;
    this.dbRun = null;
  }

  async initialize() {
    this.db = new sqlite3.Database(this.dbPath);
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));
    this.dbRun = promisify(this.db.run.bind(this.db));

    await this.createTables();
    await this.seedData();
  }

  async close() {
    if (this.db) {
      await promisify(this.db.close.bind(this.db))();
    }
  }

  async get(query, params = []) {
    return await this.dbGet(query, params);
  }

  async all(query, params = []) {
    return await this.dbAll(query, params);
  }

  async run(query, params = []) {
    return await this.dbRun(query, params);
  }

  async beginTransaction() {
    await this.dbRun('BEGIN TRANSACTION');
    return {
      commit: () => this.dbRun('COMMIT'),
      rollback: () => this.dbRun('ROLLBACK')
    };
  }

  async createTables() {
    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        default_currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.dbRun(`
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

    await this.dbRun(`
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

    await this.dbRun(`
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

    await this.dbRun(`
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
  }

  async seedData() {
    const userCount = await this.dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      await this.dbRun("INSERT INTO users (name, email) VALUES ('Default User', 'user@example.com')");

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
        await this.dbRun(
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
        await this.dbRun(
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
        await this.dbRun(
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
        await this.dbRun(
          "INSERT INTO transactions (id, type, amount, category_id, ledger_id, description, date, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [txn.id, txn.type, txn.amount, txn.category_id, txn.ledger_id, txn.description, txn.date, txn.tags]
        );
      }

      console.error('Database initialized with sample data');
    }
  }

  async getUser() {
    return await this.dbGet('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');
  }

  async getCategories(filters = {}) {
    let query = 'SELECT * FROM categories';
    const params = [];

    if (filters.active_only) {
      query += ' WHERE active = 1';
    }

    query += ' ORDER BY type, name';

    return await this.dbAll(query, params);
  }

  async getLedgers(filters = {}) {
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

    return await this.dbAll(query, params);
  }

  async getBudgets(filters = {}) {
    let query = `
      SELECT b.*, c.name as category_name, c.type as category_type
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
    `;

    if (filters.active_only) {
      query += ' WHERE b.active = 1';
    }

    query += ' ORDER BY b.period, c.name';

    return await this.dbAll(query);
  }

  async queryTransactions(options = {}) {
    const { type = 'all', filters = {}, pagination = {}, sort = {} } = options;

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
    const totalCount = await this.dbGet(countQuery, params);

    query += ` LIMIT ? OFFSET ?`;
    params.push(actualLimit, offset);

    const transactions = await this.dbAll(query, params);

    return {
      transactions,
      pagination: {
        page,
        limit: actualLimit,
        total: totalCount.count,
        has_next: (page * actualLimit) < totalCount.count
      }
    };
  }

  // Import additional methods
  async getRecordDetails(recordType, recordId, includeRelated = false) {
    const { sqliteAdapterMethods } = await import('./sqlite-methods.js');
    return await sqliteAdapterMethods.getRecordDetails.call(this, recordType, recordId, includeRelated);
  }

  async getInsightsData(dataScope, period, includeComponents = {}) {
    const { sqliteAdapterMethods } = await import('./sqlite-methods.js');
    return await sqliteAdapterMethods.getInsightsData.call(this, dataScope, period, includeComponents);
  }

  async batchCreateTransactions(transactions, validateOnly = false) {
    const { generateId, formatDate, validateTransaction } = await import('../utils/helpers.js');
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      
      try {
        // Validate transaction
        const validationErrors = validateTransaction(txn);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }
        
        const category = await this.dbGet('SELECT * FROM categories WHERE id = ?', [txn.category]);
        if (!category) {
          throw new Error(`Category not found: ${txn.category}`);
        }
        
        const ledger_id = txn.ledger_id || 'checking';
        const ledger = await this.dbGet('SELECT * FROM ledgers WHERE id = ?', [ledger_id]);
        if (!ledger) {
          throw new Error(`Ledger not found: ${ledger_id}`);
        }
        
        if (validateOnly) {
          results.push({
            index: i,
            status: 'valid',
            transaction: txn
          });
        } else {
          const transaction_id = generateId('txn');
          const tags = txn.tags ? txn.tags.join(',') : '';
          
          await this.dbRun(`
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
      results,
      errors,
      summary: {
        total: transactions.length,
        successful: results.length,
        failed: errors.length,
        validate_only: validateOnly
      }
    };
  }

  async exportData(exportType, filters = {}, options = {}) {
    let data;
    
    switch (exportType) {
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
        
        data = await this.dbAll(query, params);
        break;
      }
      
      case 'summary_report': {
        const startDate = filters.date_start || '2024-01-01';
        const endDate = filters.date_end || new Date().toISOString().slice(0, 10);
        
        const totals = await this.dbGet(`
          SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
          FROM transactions
          WHERE date >= ? AND date <= ?
        `, [startDate, endDate]);
        
        const breakdown = await this.dbAll(`
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
        const tables = ['users', 'categories', 'ledgers', 'budgets', 'transactions'];
        data = {};
        
        for (const table of tables) {
          data[table] = await this.dbAll(`SELECT * FROM ${table}`);
        }
        
        data.exported_at = new Date().toISOString();
        data.version = '1.0.0';
        break;
      }
      
      default:
        throw new Error(`Unknown export_type: ${exportType}`);
    }
    
    return data;
  }

  async analyzeSpending(analysisType, period, filters = {}) {
    switch (analysisType) {
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
        
        const breakdown = await this.dbAll(query, params);
        const total = breakdown.reduce((sum, item) => sum + item.total_amount, 0);
        
        const result = breakdown.map(item => ({
          ...item,
          percentage: total > 0 ? (item.total_amount / total * 100).toFixed(2) : 0
        }));
        
        return { breakdown: result, total_amount: total };
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
        
        const trends = await this.dbAll(query, params);
        
        return { trends, grouping };
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
        
        const variances = await this.dbAll(query, [period.start, period.end]);
        
        const result = variances.map(item => ({
          ...item,
          variance: item.actual_amount - item.budgeted_amount,
          variance_percentage: item.budgeted_amount > 0 ? 
            ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount * 100).toFixed(2) : 0,
          status: item.actual_amount > item.budgeted_amount ? 'over' : 'under'
        }));
        
        return { variances: result, period };
      }
      
      default:
        throw new Error(`Unknown analysis_type: ${analysisType}`);
    }
  }

  async getSummary(summaryType, period, dateRange = null, includeDetails = false) {
    const { calculatePeriodDates } = await import('../utils/helpers.js');
    const { start: startDate, end: endDate } = calculatePeriodDates(period, dateRange);
    
    switch (summaryType) {
      case 'period_totals': {
        const totals = await this.dbGet(`
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
        
        if (includeDetails) {
          const breakdown = await this.dbAll(`
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
        
        return result;
      }
      
      case 'budget_status': {
        const budgets = await this.dbAll(`
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
          budgets: result,
          period: { start: startDate, end: endDate, type: period }
        };
      }
      
      case 'quick_stats': {
        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        const stats = await this.dbGet(`
          SELECT 
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_transactions,
            AVG(CASE WHEN type = 'expense' THEN amount END) as avg_expense,
            MAX(CASE WHEN type = 'expense' THEN amount END) as max_expense
          FROM transactions
          WHERE date >= ? AND date <= ?
        `, [startDate, endDate]);
        
        const topCategory = await this.dbGet(`
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
        
        return result;
      }
      
      default:
        throw new Error(`Unknown summary_type: ${summaryType}`);
    }
  }
}