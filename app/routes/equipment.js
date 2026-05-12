const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');

// GET /equipment/:userId/enhance/:equipInstanceId/preview
router.get('/:userId/enhance/:equipInstanceId/preview', equipmentController.getEnhancePreview);

// POST /equipment/:userId/enhance/:equipInstanceId
router.post('/:userId/enhance/:equipInstanceId', equipmentController.postEnhance);

module.exports = router;
