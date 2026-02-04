const db = require('../infra/database');

async function createObject(objectType, data) {
  const [result] = await db.execute(
    'INSERT INTO objects (object_type, data) VALUES (?, ?)',
    [objectType, JSON.stringify(data || {})]
  );
  return { id: result.insertId, objectType };
}

async function getObjectById(id) {
  const [rows] = await db.execute(
    'SELECT id, object_type, data, created_at, updated_at FROM objects WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function updateObject(id, data) {
  const [result] = await db.execute(
    'UPDATE objects SET data = ? WHERE id = ?',
    [JSON.stringify(data || {}), id]
  );
  return result.affectedRows > 0;
}

async function deleteObject(id) {
  const [result] = await db.execute('DELETE FROM objects WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createObject,
  getObjectById,
  updateObject,
  deleteObject
};
