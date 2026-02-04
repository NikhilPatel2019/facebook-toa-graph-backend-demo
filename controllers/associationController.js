const HttpError = require('../utils/httpError');
const { parseId, parseLimit, parseCursor } = require('../validators/common');
const {
  validateAssociationType,
  validateAssociationData,
  parseAssociationStatus
} = require('../validators/associations');
const associationService = require('../services/associationService');

async function createAssociation(req, res) {
  const { sourceId, destinationId, associationType, data } = req.body;
  const parsedSourceId = parseId(sourceId, 'sourceId');
  const parsedDestinationId = parseId(destinationId, 'destinationId');
  validateAssociationType(associationType);
  validateAssociationData(associationType, data);

  const existsResult = await associationService.ensureObjectsExist(
    parsedSourceId,
    parsedDestinationId
  );
  if (!existsResult.ok) {
    throw new HttpError(400, `Invalid ${existsResult.field}`);
  }

  try {
    await associationService.createAssociation({
      sourceId: parsedSourceId,
      destinationId: parsedDestinationId,
      associationType,
      data
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Association already exists');
    }
    throw error;
  }

  res.json({ success: true });
}

async function getAssociation(req, res) {
  const parsedSourceId = parseId(req.params.sourceId, 'sourceId');
  const parsedDestinationId = parseId(req.params.destinationId, 'destinationId');
  const associationType = req.params.type;
  validateAssociationType(associationType);

  const association = await associationService.getAssociation({
    sourceId: parsedSourceId,
    destinationId: parsedDestinationId,
    associationType
  });

  if (!association) {
    throw new HttpError(404, 'Association not found');
  }

  res.json(association);
}

async function updateAssociation(req, res) {
  const { sourceId, destinationId, associationType, data, status } = req.body;
  const parsedSourceId = parseId(sourceId, 'sourceId');
  const parsedDestinationId = parseId(destinationId, 'destinationId');
  validateAssociationType(associationType);
  const parsedStatus = parseAssociationStatus(status);
  validateAssociationData(associationType, data);

  if (data === undefined && parsedStatus === undefined) {
    throw new HttpError(400, 'Nothing to update');
  }

  const updated = await associationService.updateAssociation({
    sourceId: parsedSourceId,
    destinationId: parsedDestinationId,
    associationType,
    data,
    status: parsedStatus
  });

  if (!updated) {
    throw new HttpError(404, 'Association not found');
  }

  res.json({ success: true });
}

async function deleteAssociation(req, res) {
  const { sourceId, destinationId, associationType } = req.body;
  const parsedSourceId = parseId(sourceId, 'sourceId');
  const parsedDestinationId = parseId(destinationId, 'destinationId');
  validateAssociationType(associationType);

  const deleted = await associationService.softDeleteAssociation({
    sourceId: parsedSourceId,
    destinationId: parsedDestinationId,
    associationType
  });

  if (!deleted) {
    throw new HttpError(404, 'Association not found');
  }

  res.json({ success: true });
}

async function listAssociations(req, res) {
  const { sourceId, type, limit, cursor } = req.query;
  const parsedSourceId = parseId(sourceId, 'sourceId');
  validateAssociationType(type);
  const limitValue = parseLimit(limit);
  const parsedCursor = parseCursor(cursor);

  const payload = await associationService.listAssociations({
    sourceId: parsedSourceId,
    associationType: type,
    limit: limitValue,
    cursor: parsedCursor
  });

  res.json(payload);
}

async function countAssociations(req, res) {
  const { sourceId, type } = req.query;
  const parsedSourceId = parseId(sourceId, 'sourceId');
  validateAssociationType(type);

  const count = await associationService.countAssociations({
    sourceId: parsedSourceId,
    associationType: type
  });

  res.json({ count });
}

module.exports = {
  createAssociation,
  getAssociation,
  updateAssociation,
  deleteAssociation,
  listAssociations,
  countAssociations
};
