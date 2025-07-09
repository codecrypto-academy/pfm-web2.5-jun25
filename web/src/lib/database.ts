/**
 * PostgreSQL Database Connection and Query Management
 * Handles connection pooling, transactions, and basic queries
 */
import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration interface
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number; // Maximum number of clients in the pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Get database configuration from environment variables
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'besu_networks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  };
};

// Global connection pool
// Use a global variable in development to prevent multiple pools due to hot reloads
let pool: Pool | null = null;
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  if (!global._besu_pg_pool) {
    // Will be initialized by initDatabase()
    // @ts-ignore
    global._besu_pg_pool = null;
  }
  // @ts-ignore
  pool = global._besu_pg_pool;
}

/**
 * Initialize the database connection pool
 */
export const initDatabase = (): Pool => {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Optional: Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('Database client connected');
      });
      pool.on('remove', () => {
        console.log('Database client removed');
      });
      // Store pool globally to prevent multiple pools
      // @ts-ignore
      global._besu_pg_pool = pool;
    }
  }
  return pool;
};

/**
 * Get the database pool (initialize if needed)
 */
export const getPool = (): Pool => {
  if (!pool) {
    return initDatabase();
  }
  return pool;
};

/**
 * Execute a query with optional parameters
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, text);
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};

/**
 * Execute a transaction with a callback function
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a client from the pool for manual transaction management
 */
export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return await pool.connect();
};

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('Database connection test successful:', {
      time: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

/**
 * Close all database connections
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connections closed');
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const [poolStats, dbStats] = await Promise.all([
      // Pool statistics
      Promise.resolve({
        totalCount: pool?.totalCount || 0,
        idleCount: pool?.idleCount || 0,
        waitingCount: pool?.waitingCount || 0,
      }),
      // Database statistics
      query(`
        SELECT 
          (SELECT count(*) FROM networks) as networks_count,
          (SELECT count(*) FROM nodes) as nodes_count,
          (SELECT count(*) FROM network_operations) as operations_count,
          (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size
      `)
    ]);

    return {
      pool: poolStats,
      database: dbStats.rows[0]
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
};

/**
 * Health check function for API endpoints
 */
export const healthCheck = async () => {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDatabase();
  process.exit(0);
});
