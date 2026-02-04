const { ALLOWED_ASSOCIATION_TYPES } = require('../config/constants');
const HttpError = require('../utils/httpError');

function ensurePlainObject(value, fieldName) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }
  return value;
}

function validateAssociationType(associationType) {
  if (typeof associationType !== 'string' || !ALLOWED_ASSOCIATION_TYPES.has(associationType)) {
    throw new HttpError(400, 'Invalid associationType');
  }
  return associationType;
}

function validateAssociationData(associationType, data) {
  if (data === undefined) {
    return undefined;
  }

  const payload = ensurePlainObject(data, 'data');

  if (associationType === 'friend') {
    if (payload.note !== undefined && typeof payload.note !== 'string') {
      throw new HttpError(400, 'Invalid data.note');
    }
  }

  if (associationType === 'like') {
    if (payload.reaction !== undefined && typeof payload.reaction !== 'string') {
      throw new HttpError(400, 'Invalid data.reaction');
    }
  }

  if (associationType === 'follow') {
    if (payload.note !== undefined && typeof payload.note !== 'string') {
      throw new HttpError(400, 'Invalid data.note');
    }
  }

  if (associationType === 'authored') {
    if (payload.role !== undefined && typeof payload.role !== 'string') {
      throw new HttpError(400, 'Invalid data.role');
    }
  }

  if (associationType === 'tagged_in') {
    if (payload.context !== undefined && typeof payload.context !== 'string') {
      throw new HttpError(400, 'Invalid data.context');
    }
  }

  if (associationType === 'located_at') {
    if (payload.precision !== undefined && typeof payload.precision !== 'string') {
      throw new HttpError(400, 'Invalid data.precision');
    }
  }

  if (associationType === 'has_comment') {
    if (payload.note !== undefined && typeof payload.note !== 'string') {
      throw new HttpError(400, 'Invalid data.note');
    }
  }

  return payload;
}

function parseAssociationStatus(status) {
  if (status === undefined) {
    return undefined;
  }
  const parsed = Number(status);
  if (!Number.isInteger(parsed) || (parsed !== 0 && parsed !== 1)) {
    throw new HttpError(400, 'Invalid status');
  }
  return parsed;
}

module.exports = {
  validateAssociationType,
  validateAssociationData,
  parseAssociationStatus
};
