/**
 * Utility functions for the expense tracker
 */

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
}

export function buildCategoryTree(categories) {
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

export function categoryTreeToMarkdown(categories, level = 0) {
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

export function calculatePeriodDates(period, dateRange = null) {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: now.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10)
      };
    
    case 'this_week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return {
        start: weekStart.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10)
      };
    
    case 'this_month':
      return {
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        end: now.toISOString().slice(0, 10)
      };
    
    case 'this_year':
      return {
        start: `${now.getFullYear()}-01-01`,
        end: now.toISOString().slice(0, 10)
      };
    
    case 'custom':
      if (!dateRange) throw new Error('date_range required for custom period');
      return {
        start: dateRange.start,
        end: dateRange.end
      };
    
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

export function validateTransaction(transaction) {
  const errors = [];
  
  if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
    errors.push('Invalid transaction type');
  }
  
  if (!transaction.amount || transaction.amount <= 0) {
    errors.push('Invalid amount');
  }
  
  if (!transaction.category) {
    errors.push('Category is required');
  }
  
  return errors;
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(2);
}

export function formatExportData(data, format, options = {}) {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'csv':
      if (!Array.isArray(data)) {
        throw new Error('CSV format requires array data');
      }
      
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => {
        return headers.map(header => {
          const value = row[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',');
      });
      
      return [csvHeaders, ...csvRows].join('\n');
    
    case 'markdown':
      if (typeof data === 'object' && data.period && data.totals && data.breakdown) {
        // Summary report format
        const { period, totals, breakdown } = data;
        
        let markdown = `# Financial Summary Report\n\n`;
        markdown += `**Period:** ${period.start} to ${period.end}\n\n`;
        markdown += `## Totals\n\n`;
        markdown += `- **Total Income:** ${formatCurrency(totals.total_income)}\n`;
        markdown += `- **Total Expenses:** ${formatCurrency(totals.total_expenses)}\n`;
        markdown += `- **Net Amount:** ${formatCurrency(totals.net_amount)}\n\n`;
        
        markdown += `## Breakdown by Category\n\n`;
        
        const incomeCategories = breakdown.filter(b => b.type === 'income');
        const expenseCategories = breakdown.filter(b => b.type === 'expense');
        
        if (incomeCategories.length > 0) {
          markdown += `### Income\n\n`;
          incomeCategories.forEach(cat => {
            markdown += `- **${cat.category}:** ${formatCurrency(cat.amount)} (${cat.transaction_count} transactions)\n`;
          });
          markdown += '\n';
        }
        
        if (expenseCategories.length > 0) {
          markdown += `### Expenses\n\n`;
          expenseCategories.forEach(cat => {
            markdown += `- **${cat.category}:** ${formatCurrency(cat.amount)} (${cat.transaction_count} transactions)\n`;
          });
        }
        
        return markdown;
      }
      
      return JSON.stringify(data, null, 2);
    
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}