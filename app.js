const express = require('express');
const db = require('./database');
const redis = require('./redis');
const app = express();

app.use(express.json());

const ALLOWED_OBJECT_TYPES = new Set(['user', 'post', 'page']);
const MAX_LIST_LIMIT = 100;

function parseId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, MAX_LIST_LIMIT);
}

function parseCursor(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parts = value.split('|');
  if (parts.length !== 2) {
    return null;
  }
  const [createdAt, destinationIdRaw] = parts;
  const destinationId = parseId(destinationIdRaw);
  if (!createdAt || !destinationId) {
    return null;
  }
  return { createdAt, destinationId };
}

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

app.post('/objects', async (req, res) => {
  const { objectType, data } = req.body;

  if (
    typeof objectType !== 'string' ||
    !ALLOWED_OBJECT_TYPES.has(objectType)
  ) {
    return res.status(400).json({ error: 'Invalid objectType' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO objects (object_type, data) VALUES (?, ?)',
      [objectType, JSON.stringify(data || {})]
    );

    res.json({
      id: result.insertId,
      objectType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/objects/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, object_type, data, created_at, updated_at FROM objects WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/objects/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { data } = req.body;

  try {
    const [result] = await db.execute(
      'UPDATE objects SET data = ? WHERE id = ?',
      [JSON.stringify(data || {}), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/objects/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const [result] = await db.execute('DELETE FROM objects WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Object not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const ALLOWED_ASSOCIATION_TYPES = new Set(['friend', 'like', 'follow']);

app.post('/associations', async (req, res) => {
  const { sourceId, destinationId, associationType, data } = req.body;

  const parsedSourceId = parseId(sourceId);
  const parsedDestinationId = parseId(destinationId);

  if (
    typeof associationType !== 'string' ||
    !ALLOWED_ASSOCIATION_TYPES.has(associationType)
  ) {
    return res.status(400).json({ error: 'Invalid associationType' });
  }
  if (!parsedSourceId || !parsedDestinationId) {
    return res.status(400).json({ error: 'Invalid sourceId or destinationId' });
  }

  try {
    const [sourceRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [parsedSourceId]);
    if (sourceRows.length === 0) {
      return res.status(400).json({ error: 'Invalid sourceId' });
    }

    const [destRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [parsedDestinationId]);
    if (destRows.length === 0) {
      return res.status(400).json({ error: 'Invalid destinationId' });
    }

    await db.execute(
      `INSERT INTO associations
       (source_id, destination_id, association_type, data, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [parsedSourceId, parsedDestinationId, associationType, JSON.stringify(data || {})]
    );

    // Invalidate cache
    await invalidateAssociationCache(parsedSourceId, associationType);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Association already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/associations/:sourceId/:type/:destinationId', async (req, res) => {
  const parsedSourceId = parseId(req.params.sourceId);
  const parsedDestinationId = parseId(req.params.destinationId);
  const associationType = req.params.type;

  if (!parsedSourceId || !parsedDestinationId) {
    return res.status(400).json({ error: 'Invalid sourceId or destinationId' });
  }
  if (typeof associationType !== 'string' || !ALLOWED_ASSOCIATION_TYPES.has(associationType)) {
    return res.status(400).json({ error: 'Invalid associationType' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT source_id, destination_id, association_type, data, created_at, status
       FROM associations
       WHERE source_id = ?
         AND destination_id = ?
         AND association_type = ?
         AND status = 1`,
      [parsedSourceId, parsedDestinationId, associationType]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/associations', async (req, res) => {
  const { sourceId, destinationId, associationType, data, status } = req.body;

  const parsedSourceId = parseId(sourceId);
  const parsedDestinationId = parseId(destinationId);

  if (
    typeof associationType !== 'string' ||
    !ALLOWED_ASSOCIATION_TYPES.has(associationType)
  ) {
    return res.status(400).json({ error: 'Invalid associationType' });
  }
  if (!parsedSourceId || !parsedDestinationId) {
    return res.status(400).json({ error: 'Invalid sourceId or destinationId' });
  }
  if (data === undefined && status === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const fields = [];
  const values = [];

  if (data !== undefined) {
    fields.push('data = ?');
    values.push(JSON.stringify(data || {}));
  }
  if (status !== undefined) {
    const parsedStatus = Number(status);
    if (!Number.isInteger(parsedStatus) || (parsedStatus !== 0 && parsedStatus !== 1)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    fields.push('status = ?');
    values.push(parsedStatus);
  }

  try {
    const [result] = await db.execute(
      `UPDATE associations
       SET ${fields.join(', ')}
       WHERE source_id = ?
         AND destination_id = ?
         AND association_type = ?`,
      [...values, parsedSourceId, parsedDestinationId, associationType]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    await invalidateAssociationCache(parsedSourceId, associationType);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/associations', async (req, res) => {
  const { sourceId, destinationId, associationType } = req.body;

  const parsedSourceId = parseId(sourceId);
  const parsedDestinationId = parseId(destinationId);

  if (
    typeof associationType !== 'string' ||
    !ALLOWED_ASSOCIATION_TYPES.has(associationType)
  ) {
    return res.status(400).json({ error: 'Invalid associationType' });
  }
  if (!parsedSourceId || !parsedDestinationId) {
    return res.status(400).json({ error: 'Invalid sourceId or destinationId' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE associations
       SET status = 0
       WHERE source_id = ?
         AND destination_id = ?
         AND association_type = ?`,
      [parsedSourceId, parsedDestinationId, associationType]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    await invalidateAssociationCache(parsedSourceId, associationType);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;

app.get('/associations', async (req, res) => {
  const { sourceId, type, limit = 20, cursor } = req.query;
  console.log("sourceId:", sourceId, "type:", type, "limit:", limit);

  const parsedSourceId = parseId(sourceId);
  if (!parsedSourceId || !type) {
    return res.status(400).json({ error: 'Missing sourceId or type' });
  }

  const limitValue = parseLimit(limit);
  const parsedCursor = parseCursor(cursor);
  if (cursor && !parsedCursor) {
    return res.status(400).json({ error: 'Invalid cursor' });
  }

  const cacheKey = `assoc:${parsedSourceId}:${type}:${cursor || 'start'}:${limitValue}`;

  try {
    // 1️⃣ Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    console.log('Cache miss for key:', cacheKey);

    // 2️⃣ Cache miss → DB
    let rows;
    if (parsedCursor) {
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
          parsedSourceId,
          type,
          parsedCursor.createdAt,
          parsedCursor.createdAt,
          parsedCursor.destinationId,
          limitValue
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
        [parsedSourceId, type, limitValue]
      );
    }

    const nextCursor = rows.length === limitValue ? buildCursor(rows[rows.length - 1]) : null;
    const payload = { items: rows, nextCursor };

    // 3️⃣ Populate cache
    await redis.set(cacheKey, JSON.stringify(payload), {
      EX: 3600 // Cache for 1 hour (optional, but good practice)
    });

    // 4️⃣ Return slice
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/associations/count', async (req, res) => {
  const { sourceId, type } = req.query;
  const parsedSourceId = parseId(sourceId);
  if (!parsedSourceId || !type) {
    return res.status(400).json({ error: 'Missing sourceId or type' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM associations
       WHERE source_id = ?
         AND association_type = ?
         AND status = 1`,
      [parsedSourceId, type]
    );

    res.json({ count: rows[0].count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/healthz', async (req, res) => {
  try {
    await Promise.all([
      db.execute('SELECT 1'),
      redis.ping()
    ]);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error(error);
    res.status(503).json({ status: 'unhealthy' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
