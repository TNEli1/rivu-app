import pg from 'pg';
const { Pool } = pg;

// Get the DATABASE_URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log(`Connecting to database: ${databaseUrl.split('@')[1]?.split('/')[0] || '(hidden)'}`);

// Configure PostgreSQL connection pool with SSL
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL service
  }
});

async function createTables() {
  try {
    // Connect to database
    console.log('Testing connection...');
    const client = await pool.connect();
    
    // Check connection
    const result = await client.query('SELECT NOW()');
    console.log(`Connection successful! Database time: ${result.rows[0].now}`);
    
    console.log('Creating tables...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(255),
        "last_name" VARCHAR(255),
        "onboarding_stage" VARCHAR(50) DEFAULT 'welcome',
        "preferences" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Users table created');
    
    // Create password_reset_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" VARCHAR(255) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Password reset tokens table created');
    
    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "color" VARCHAR(50),
        "icon" VARCHAR(50),
        "is_default" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Categories table created');
    
    // Create subcategories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "subcategories" (
        "id" SERIAL PRIMARY KEY,
        "category_id" INTEGER NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Subcategories table created');
    
    // Create transaction_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "transaction_accounts" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "balance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) DEFAULT 'USD',
        "is_default" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Transaction accounts table created');
    
    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "account_id" INTEGER REFERENCES "transaction_accounts"("id") ON DELETE SET NULL,
        "category_id" INTEGER REFERENCES "categories"("id") ON DELETE SET NULL,
        "subcategory_id" INTEGER REFERENCES "subcategories"("id") ON DELETE SET NULL,
        "amount" DECIMAL(15, 2) NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "description" TEXT,
        "notes" TEXT,
        "is_recurring" BOOLEAN DEFAULT FALSE,
        "plaid_transaction_id" VARCHAR(255),
        "marked_not_duplicate" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Transactions table created');
    
    // Create budget_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "budget_categories" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category_id" INTEGER REFERENCES "categories"("id") ON DELETE SET NULL,
        "month" VARCHAR(7) NOT NULL, -- Format: YYYY-MM
        "amount" DECIMAL(15, 2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Budget categories table created');
    
    // Create savings_goals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "savings_goals" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "target_amount" DECIMAL(15, 2) NOT NULL,
        "current_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
        "target_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Savings goals table created');
    
    // Create rivu_scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "rivu_scores" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "overall_score" INTEGER NOT NULL,
        "spending_score" INTEGER NOT NULL,
        "savings_score" INTEGER NOT NULL,
        "debt_score" INTEGER NOT NULL,
        "investment_score" INTEGER NOT NULL,
        "month" VARCHAR(7) NOT NULL, -- Format: YYYY-MM
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("user_id", "month")
      )
    `);
    console.log('- Rivu scores table created');
    
    // Create score_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "score_history" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "score_type" VARCHAR(50) NOT NULL,
        "score_value" INTEGER NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Score history table created');
    
    // Create nudges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "nudges" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" VARCHAR(50) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "action_text" VARCHAR(255),
        "action_url" VARCHAR(255),
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "priority" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Nudges table created');
    
    // Create plaid_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "plaid_items" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "item_id" VARCHAR(255) NOT NULL UNIQUE,
        "access_token" VARCHAR(255) NOT NULL,
        "institution_id" VARCHAR(255),
        "institution_name" VARCHAR(255),
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "last_update" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Plaid items table created');
    
    // Create plaid_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "plaid_accounts" (
        "id" SERIAL PRIMARY KEY,
        "plaid_item_id" INTEGER NOT NULL REFERENCES "plaid_items"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "account_id" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "mask" VARCHAR(10),
        "official_name" VARCHAR(255),
        "type" VARCHAR(50) NOT NULL,
        "subtype" VARCHAR(50),
        "balance_available" DECIMAL(15, 2),
        "balance_current" DECIMAL(15, 2),
        "balance_limit" DECIMAL(15, 2),
        "balance_iso_currency_code" VARCHAR(10) DEFAULT 'USD',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Plaid accounts table created');
    
    // Create plaid_webhook_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "plaid_webhook_events" (
        "id" SERIAL PRIMARY KEY,
        "item_id" VARCHAR(255) NOT NULL,
        "webhook_type" VARCHAR(50) NOT NULL,
        "webhook_code" VARCHAR(50) NOT NULL,
        "error" JSONB,
        "new_transactions" INTEGER,
        "removed_transactions" TEXT[],
        "payload" JSONB NOT NULL,
        "processed" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Plaid webhook events table created');
    
    console.log('All tables created successfully!');
    
    // List all tables
    const tableList = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nCurrent tables in the database:');
    tableList.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Release client
    client.release();
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run migration
createTables()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });