const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const objectController = require('../controllers/objectController');

const router = express.Router();

router.post('/', asyncHandler(objectController.createObject));
router.get('/:id', asyncHandler(objectController.getObject));
router.put('/:id', asyncHandler(objectController.updateObject));
router.delete('/:id', asyncHandler(objectController.deleteObject));

module.exports = router;
