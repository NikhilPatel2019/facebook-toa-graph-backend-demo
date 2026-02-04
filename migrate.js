const db = require('./database');

async function migrate() {
  try {
    const connection = await db.getConnection();
    console.log('Connected to database for migration...');

    // Create objects table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS objects (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        object_type VARCHAR(50) NOT NULL,
        data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "objects" ensured.');

    // Create associations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS associations (
        source_id BIGINT NOT NULL,
        destination_id BIGINT NOT NULL,
        association_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        data JSON,
        status TINYINT DEFAULT 1,
        PRIMARY KEY (source_id, association_type, destination_id),
        INDEX idx_assoc_query (source_id, association_type, created_at, destination_id)
      )
    `);
    console.log('Table "associations" ensured.');

    const [indexRows] = await connection.query(
      `SELECT 1
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'associations'
         AND INDEX_NAME = 'idx_assoc_query'
       LIMIT 1`,
      [process.env.DB_NAME]
    );
    if (indexRows.length === 0) {
      await connection.query(
        'CREATE INDEX idx_assoc_query ON associations (source_id, association_type, created_at, destination_id)'
      );
      console.log('Index "idx_assoc_query" created.');
    }

    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
