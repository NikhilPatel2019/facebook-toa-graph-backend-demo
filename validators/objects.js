const { ALLOWED_OBJECT_TYPES } = require('../config/constants');
const HttpError = require('../utils/httpError');

function ensurePlainObject(value, fieldName) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }
  return value;
}

function validateObjectType(objectType) {
  if (typeof objectType !== 'string' || !ALLOWED_OBJECT_TYPES.has(objectType)) {
    throw new HttpError(400, 'Invalid objectType');
  }
  return objectType;
}

function validateObjectData(objectType, data) {
  const payload = ensurePlainObject(data, 'data');

  if (objectType === 'user') {
    if (typeof payload.name !== 'string' || payload.name.trim() === '') {
      throw new HttpError(400, 'Missing or invalid data.name');
    }
    if (typeof payload.username !== 'string' || payload.username.trim() === '') {
      throw new HttpError(400, 'Missing or invalid data.username');
    }
  }

  if (objectType === 'post') {
    if (!Number.isInteger(payload.authorId) || payload.authorId <= 0) {
      throw new HttpError(400, 'Missing or invalid data.authorId');
    }
    if (typeof payload.body !== 'string' || payload.body.trim() === '') {
      throw new HttpError(400, 'Missing or invalid data.body');
    }
  }

  if (objectType === 'page') {
    if (typeof payload.title !== 'string' || payload.title.trim() === '') {
      throw new HttpError(400, 'Missing or invalid data.title');
    }
  }

  return payload;
}

module.exports = {
  validateObjectType,
  validateObjectData
};
