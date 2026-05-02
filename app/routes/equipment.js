const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');

// POST /equipment/:userId/enhance/:equipInstanceId
router.post('/:userId/enhance/:equipInstanceId', equipmentController.postEnhance);

module.exports = router;
