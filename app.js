const express = require('express');
const db = require('./database');
const app = express();

app.use(express.json());

const ALLOWED_OBJECT_TYPES = new Set(['user', 'post', 'page']);

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

const ALLOWED_ASSOCIATION_TYPES = new Set(['friend', 'like', 'follow']);

app.post('/associations', async (req, res) => {
  const { sourceId, destinationId, associationType, data } = req.body;

  if (
    typeof associationType !== 'string' ||
    !ALLOWED_ASSOCIATION_TYPES.has(associationType)
  ) {
    return res.status(400).json({ error: 'Invalid associationType' });
  }

  try {
    const [sourceRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [sourceId]);
    if (sourceRows.length === 0) {
      return res.status(400).json({ error: 'Invalid sourceId' });
    }

    const [destRows] = await db.execute('SELECT 1 FROM objects WHERE id = ?', [destinationId]);
    if (destRows.length === 0) {
      return res.status(400).json({ error: 'Invalid destinationId' });
    }

    await db.execute(
      `INSERT INTO associations
       (source_id, destination_id, association_type, data, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [sourceId, destinationId, associationType, JSON.stringify(data || {})]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Association already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;

app.get('/associations', async (req, res) => {
  const { sourceId, type, limit = 20 } = req.query;

  if (!sourceId || !type) {
    return res.status(400).json({ error: 'Missing sourceId or type' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT destination_id, data, created_at
       FROM associations
       WHERE source_id = ?
         AND association_type = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [sourceId, type, Number(limit)]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
