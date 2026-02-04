const HttpError = require('../utils/httpError');
const { parseId } = require('../validators/common');
const { validateObjectType, validateObjectData } = require('../validators/objects');
const objectService = require('../services/objectService');

async function createObject(req, res) {
  const { objectType, data } = req.body;
  validateObjectType(objectType);
  validateObjectData(objectType, data);

  const result = await objectService.createObject(objectType, data);
  res.json(result);
}

async function getObject(req, res) {
  const id = parseId(req.params.id, 'id');
  const object = await objectService.getObjectById(id);
  if (!object) {
    throw new HttpError(404, 'Object not found');
  }
  res.json(object);
}

async function updateObject(req, res) {
  const id = parseId(req.params.id, 'id');
  const { data } = req.body;

  const existing = await objectService.getObjectById(id);
  if (!existing) {
    throw new HttpError(404, 'Object not found');
  }

  validateObjectData(existing.object_type, data);

  const updated = await objectService.updateObject(id, data);
  if (!updated) {
    throw new HttpError(404, 'Object not found');
  }
  res.json({ success: true });
}

async function deleteObject(req, res) {
  const id = parseId(req.params.id, 'id');
  const deleted = await objectService.deleteObject(id);
  if (!deleted) {
    throw new HttpError(404, 'Object not found');
  }
  res.json({ success: true });
}

module.exports = {
  createObject,
  getObject,
  updateObject,
  deleteObject
};
