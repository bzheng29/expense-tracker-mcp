// Additional methods for SQLite adapter
// This file contains the complex methods that would make the main adapter file too long

export const sqliteAdapterMethods = {
  async getRecordDetails(recordType, recordId, includeRelated = false) {
    switch (recordType) {
      case 'transaction': {
        const transaction = await this.dbGet(`
          SELECT t.*, c.name as category_name, c.type as category_type, 
                 l.name as ledger_name, l.type as ledger_type
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          JOIN ledgers l ON t.ledger_id = l.id
          WHERE t.id = ?
        `, [recordId]);

        if (!transaction) {
          throw new Error(`Transaction not found: ${recordId}`);
        }

        const result = { transaction };

        if (includeRelated) {
          const relatedTransactions = await this.dbAll(`
            SELECT t.*, c.name as category_name
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.category_id = ? AND t.id != ?
            ORDER BY t.date DESC
            LIMIT 5
          `, [transaction.category_id, recordId]);

          result.related_transactions = relatedTransactions;
        }

        return result;
      }

      case 'ledger_record': {
        const ledger = await this.dbGet('SELECT * FROM ledgers WHERE id = ?', [recordId]);

        if (!ledger) {
          throw new Error(`Ledger not found: ${recordId}`);
        }

        const result = { ledger };

        if (includeRelated) {
          const recentTransactions = await this.dbAll(`
            SELECT t.*, c.name as category_name
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.ledger_id = ?
            ORDER BY t.date DESC
            LIMIT 10
          `, [recordId]);

          result.recent_transactions = recentTransactions;
        }

        return result;
      }

      case 'budget_snapshot': {
        const budget = await this.dbGet(`
          SELECT b.*, c.name as category_name, c.type as category_type
          FROM budgets b
          JOIN categories c ON b.category_id = c.id
          WHERE b.id = ?
        `, [recordId]);

        if (!budget) {
          throw new Error(`Budget not found: ${recordId}`);
        }

        const result = { budget };

        if (includeRelated) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const monthlySpending = await this.dbAll(`
            SELECT DATE(t.date) as date, SUM(t.amount) as daily_total
            FROM transactions t
            WHERE t.category_id = ? AND t.type = 'expense'
              AND t.date >= ? AND t.date <= ?
            GROUP BY DATE(t.date)
            ORDER BY t.date DESC
          `, [budget.category_id, `${currentMonth}-01`, `${currentMonth}-31`]);

          result.monthly_spending = monthlySpending;
        }

        return result;
      }

      default:
        throw new Error(`Unknown record_type: ${recordType}`);
    }
  },

  async getInsightsData(dataScope, period, includeComponents = {}) {
    const { current, comparison } = period;
    
    let result = {
      data_scope: dataScope,
      period,
      analysis_data: {},
      generated_at: new Date().toISOString()
    };
    
    switch (dataScope) {
      case 'spending_patterns': {
        // Current period spending by category
        const currentSpending = await this.dbAll(`
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
          const comparisonSpending = await this.dbAll(`
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
        const dailySpending = await this.dbAll(`
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
        const frequencyData = await this.dbAll(`
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
        const budgetAnalysis = await this.dbAll(`
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
        const budgetTrends = await this.dbAll(`
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
        const averagesByCategory = await this.dbAll(`
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
        const outliers = await this.dbAll(`
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
        const dailySpikes = await this.dbAll(`
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
        const newMerchants = await this.dbAll(`
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
        const recurringCharges = await this.dbAll(`
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
        const categoryAnalysis = await this.dbAll(`
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
        const microTransactions = await this.dbAll(`
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
        
        const subscriptionAnalysis = await this.dbAll(`
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
    if (includeComponents.transactions) {
      const sampleTransactions = await this.dbAll(`
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
    
    if (includeComponents.statistics) {
      const statistics = await this.dbGet(`
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
    
    if (includeComponents.historical_averages) {
      const historicalAverages = await this.dbAll(`
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
    
    if (includeComponents.peer_comparison) {
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
    
    return result;
  }
};