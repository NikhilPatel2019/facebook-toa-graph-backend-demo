const db = require('../infra/database');
const redis = require('../infra/redis');

function buildCursor(row) {
  if (!row || !row.created_at || !row.destination_id) {
    return null;
  }
  const createdAtValue =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return `${createdAtValue}|${row.destination_id}`;
}

async function invalidateAssociationCache(sourceId, associationType) {
  const pattern = `assoc:${sourceId}:${associationType}:*`;
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    const keys = result.keys;
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } while (cursor !== '0');
}

async function ensureObjectsExist(sourceId, destinationId) {
  const [sourceRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [sourceId]);
  if (sourceRows.length === 0) {
    return { ok: false, field: 'sourceId' };
  }
  const [destRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [destinationId]);
  if (destRows.length === 0) {
    return { ok: false, field: 'destinationId' };
  }
  return { ok: true };
}

async function createAssociation({ sourceId, destinationId, associationType, data }) {
  await db.execute(
    `INSERT INTO associations
     (source_id, destination_id, association_type, data, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [sourceId, destinationId, associationType, JSON.stringify(data || {})]
  );
  await invalidateAssociationCache(sourceId, associationType);
}

async function getAssociation({ sourceId, destinationId, associationType }) {
  const [rows] = await db.execute(
    `SELECT source_id, destination_id, association_type, data, created_at, status
     FROM associations
     WHERE source_id = ?
       AND destination_id = ?
       AND association_type = ?
       AND status = 1`,
    [sourceId, destinationId, associationType]
  );
  return rows[0] || null;
}

async function updateAssociation({ sourceId, destinationId, associationType, data, status }) {
  const fields = [];
  const values = [];

  if (data !== undefined) {
    fields.push('data = ?');
    values.push(JSON.stringify(data || {}));
  }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }

  const [result] = await db.execute(
    `UPDATE associations
     SET ${fields.join(', ')}
     WHERE source_id = ?
       AND destination_id = ?
       AND association_type = ?`,
    [...values, sourceId, destinationId, associationType]
  );

  if (result.affectedRows > 0) {
    await invalidateAssociationCache(sourceId, associationType);
    return true;
  }
  return false;
}

async function softDeleteAssociation({ sourceId, destinationId, associationType }) {
  const [result] = await db.execute(
    `UPDATE associations
     SET status = 0
     WHERE source_id = ?
       AND destination_id = ?
       AND association_type = ?`,
    [sourceId, destinationId, associationType]
  );

  if (result.affectedRows > 0) {
    await invalidateAssociationCache(sourceId, associationType);
    return true;
  }
  return false;
}

async function listAssociations({ sourceId, associationType, limit, cursor }) {
  const cacheKey = `assoc:${sourceId}:${associationType}:${cursor || 'start'}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let rows;
  if (cursor) {
    [rows] = await db.execute(
      `SELECT destination_id, data, created_at
       FROM associations
       WHERE source_id = ?
         AND association_type = ?
         AND status = 1
         AND (created_at < ? OR (created_at = ? AND destination_id < ?))
       ORDER BY created_at DESC, destination_id DESC
       LIMIT ?`,
      [
        sourceId,
        associationType,
        cursor.createdAt,
        cursor.createdAt,
        cursor.destinationId,
        limit
      ]
    );
  } else {
    [rows] = await db.execute(
      `SELECT destination_id, data, created_at
       FROM associations
       WHERE source_id = ?
         AND association_type = ?
         AND status = 1
       ORDER BY created_at DESC, destination_id DESC
       LIMIT ?`,
      [sourceId, associationType, limit]
    );
  }

  const nextCursor = rows.length === limit ? buildCursor(rows[rows.length - 1]) : null;
  const payload = { items: rows, nextCursor };

  await redis.set(cacheKey, JSON.stringify(payload), { EX: 3600 });
  return payload;
}

async function countAssociations({ sourceId, associationType }) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count
     FROM associations
     WHERE source_id = ?
       AND association_type = ?
       AND status = 1`,
    [sourceId, associationType]
  );

  return rows[0].count;
}

module.exports = {
  ensureObjectsExist,
  createAssociation,
  getAssociation,
  updateAssociation,
  softDeleteAssociation,
  listAssociations,
  countAssociations
};
