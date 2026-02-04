const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const associationController = require('../controllers/associationController');

const router = express.Router();

router.post('/', asyncHandler(associationController.createAssociation));
router.get('/', asyncHandler(associationController.listAssociations));
router.get('/count', asyncHandler(associationController.countAssociations));
router.get('/:sourceId/:type/:destinationId', asyncHandler(associationController.getAssociation));
router.put('/', asyncHandler(associationController.updateAssociation));
router.delete('/', asyncHandler(associationController.deleteAssociation));

module.exports = router;
