const db = require('../infra/database');
const redis = require('../infra/redis');
const HttpError = require('../utils/httpError');

async function healthCheck(req, res) {
  try {
    await Promise.all([
      db.execute('SELECT 1'),
      redis.ping()
    ]);
  } catch (error) {
    throw new HttpError(503, 'Service Unavailable');
  }

  res.json({ status: 'ok' });
}

module.exports = {
  healthCheck
};
