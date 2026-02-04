const ALLOWED_OBJECT_TYPES = new Set(['user', 'post', 'page', 'checkin', 'place', 'comment']);
const ALLOWED_ASSOCIATION_TYPES = new Set([
  'friend',
  'like',
  'follow',
  'authored',
  'tagged_in',
  'located_at',
  'has_comment'
]);
const MAX_LIST_LIMIT = 100;

module.exports = {
  ALLOWED_OBJECT_TYPES,
  ALLOWED_ASSOCIATION_TYPES,
  MAX_LIST_LIMIT
};
