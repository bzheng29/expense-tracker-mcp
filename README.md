# Expense Tracker MCP Server

A comprehensive expense tracking MCP server for Claude Desktop with 8 professional-grade tools based on simplified design principles and modular architecture.

## 🚀 Features

- **8 Core Tools**: From basic queries to AI-powered insights
- **Modular Architecture**: Clean separation of concerns with pluggable database support
- **Database Agnostic**: Support for SQLite (implemented), PostgreSQL, MongoDB, and MySQL (planned)
- **Hierarchical Categories**: Organized expense/income categories with Markdown tree view
- **Advanced Analytics**: Category breakdown, time trends, budget variance analysis
- **Flexible Exports**: JSON, CSV, and Markdown report formats
- **Batch Operations**: Efficient bulk transaction creation with validation
- **Configuration Management**: Environment variable support and validation

## 🛠️ Tools

1. **get_account_data** - Retrieve account configuration and categories
2. **query_transactions** - Advanced transaction filtering with pagination
3. **analyze_spending** - Category breakdown, trends, and budget variance
4. **get_summary** - Period totals, budget status, quick stats
5. **get_record_details** - Detailed record information with related data
6. **get_insights_data** - Comprehensive data for AI analysis and insights
7. **batch_create_transactions** - Bulk transaction creation
8. **export_data** - Flexible data export in multiple formats

## 🏗️ Architecture

The server follows a modular architecture with clean separation of concerns:

```
expense-tracker-mcp/
├── server.js                 # Main server entry point
├── src/
│   ├── config.js             # Configuration management
│   ├── database/
│   │   ├── interface.js      # Database abstraction interface
│   │   ├── factory.js        # Database factory pattern
│   │   ├── sqlite-adapter.js # SQLite implementation
│   │   └── sqlite-methods.js # Extended SQLite methods
│   ├── tools/
│   │   ├── definitions.js    # MCP tool schemas
│   │   └── handlers.js       # Tool implementation handlers
│   └── utils/
│       └── helpers.js        # Utility functions
└── package.json
```

### Database Abstraction

The server uses a database abstraction layer that allows easy switching between different database backends:

- **SQLite**: Production-ready implementation (default)
- **PostgreSQL**: Planned - enterprise-grade support
- **MongoDB**: Planned - document-based storage
- **MySQL**: Planned - relational database alternative

### Configuration

Environment variables are supported for all configuration options:

```bash
# Database configuration
DB_TYPE=sqlite              # Database type (sqlite, postgres, mongodb)
DB_PATH=./expense_tracker.db # SQLite database path
DB_HOST=localhost           # Database host (for postgres/mysql)
DB_PORT=5432               # Database port
DB_NAME=expense_tracker    # Database name
DB_USER=postgres           # Database user
DB_PASSWORD=               # Database password

# Server configuration
SERVER_NAME=expense-tracker
SERVER_VERSION=1.0.0
DEBUG=false

# Application configuration
DEFAULT_CURRENCY=USD
MAX_TRANSACTION_BATCH=100
MAX_QUERY_LIMIT=100
SEED_DATA=true
```

## 📋 Prerequisites

- Node.js 18+
- Claude Desktop application

## 🔧 Installation

1. Clone this repository:
```bash
git clone https://github.com/bzheng29/expense-tracker-mcp.git
cd expense-tracker-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure Claude Desktop by editing `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "expense-tracker": {
      "command": "node",
      "args": ["<path-to-project>/server.js"],
      "env": {}
    }
  }
}
```

4. Restart Claude Desktop to load the MCP server.

## 🏃 Running the Server

```bash
npm start
```

## 📊 Database Schema

The server uses SQLite with these tables:
- **users** - Account profiles with currency settings
- **categories** - Hierarchical expense/income categories
- **ledgers** - Account types (checking, savings, credit, cash)
- **budgets** - Monthly/weekly/yearly budget tracking
- **transactions** - Full transaction history with tags
- **ai_insights** - Stored recommendations and alerts

## 📈 Sample Data

The server includes sample data for testing:
- 14 categories in hierarchical structure (Food → Groceries/Restaurants, etc.)
- 4 ledger accounts with realistic balances
- 4 active budgets with monthly limits
- 8 sample transactions from current month
- 3 AI insights for spending alerts and suggestions

## 💡 Usage Examples

### Monthly Budget Review
```javascript
// Get current budget status
get_summary({
  summary_type: 'budget_status',
  period: 'this_month',
  include_details: true
})

// Analyze spending by category
analyze_spending({
  analysis_type: 'category_breakdown',
  period: { start: '2024-01-01', end: '2024-01-31' }
})

// Get rich data for AI insights
get_insights_data({
  data_scope: 'spending_patterns',
  period: {
    current: { start: '2024-01-01', end: '2024-01-31' },
    comparison: { start: '2023-12-01', end: '2023-12-31' }
  },
  include_components: {
    statistics: true,
    historical_averages: true
  }
})
```

### Transaction Management
```javascript
// Find all dining expenses over $50 this year
query_transactions({
  type: 'expense',
  filters: {
    categories: ['dining', 'restaurants'],
    min_amount: 50,
    date_start: '2024-01-01'
  },
  sort: { field: 'amount', order: 'desc' }
})

// Create multiple transactions
batch_create_transactions({
  transactions: [
    {
      type: 'expense',
      amount: 45.99,
      category: 'groceries',
      description: 'Weekly shopping'
    }
  ]
})
```

### Data Export
```javascript
// Generate year-end report
export_data({
  export_type: 'summary_report',
  format: 'markdown',
  filters: {
    date_start: '2024-01-01',
    date_end: '2024-12-31'
  }
})
```

## 🔒 Key Features

- **Pagination**: Max 100 items per page for performance
- **Flexible Filtering**: By date, category, amount, text search
- **Category Trees**: Displayed as Markdown hierarchies
- **Budget Variance**: Analysis with over/under status
- **Time Trends**: Analysis by day/week/month grouping
- **Multiple Export Formats**: JSON, CSV, Markdown reports
- **Batch Operations**: With comprehensive validation
- **AI Insights**: With metadata and contextual recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Model Context Protocol Documentation](https://docs.anthropic.com/en/docs/mcp)
- [Claude Desktop](https://claude.ai/desktop)
- [SQLite Documentation](https://sqlite.org/docs.html)

## 🐛 Issues

If you encounter any issues, please check:
1. Node.js version compatibility
2. Claude Desktop configuration
3. Database permissions

For support, please open an issue in this repository.