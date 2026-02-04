const { MAX_LIST_LIMIT } = require('../config/constants');
const HttpError = require('../utils/httpError');

function parseId(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }
  return parsed;
}

function parseLimit(value) {
  if (value === undefined) {
    return 20;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, 'Invalid limit');
  }
  return Math.min(parsed, MAX_LIST_LIMIT);
}

function parseCursor(value) {
  if (!value) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Invalid cursor');
  }
  const parts = value.split('|');
  if (parts.length !== 2) {
    throw new HttpError(400, 'Invalid cursor');
  }
  const [createdAt, destinationIdRaw] = parts;
  const destinationId = parseId(destinationIdRaw, 'cursor destinationId');
  if (!createdAt) {
    throw new HttpError(400, 'Invalid cursor');
  }
  return { createdAt, destinationId };
}

module.exports = {
  parseId,
  parseLimit,
  parseCursor
};
