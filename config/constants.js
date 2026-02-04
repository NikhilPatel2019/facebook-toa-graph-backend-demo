const ALLOWED_OBJECT_TYPES = new Set(['user', 'post', 'page']);
const ALLOWED_ASSOCIATION_TYPES = new Set(['friend', 'like', 'follow']);
const MAX_LIST_LIMIT = 100;

module.exports = {
  ALLOWED_OBJECT_TYPES,
  ALLOWED_ASSOCIATION_TYPES,
  MAX_LIST_LIMIT
};
