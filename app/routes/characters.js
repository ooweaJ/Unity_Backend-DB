const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');

router.post('/draw/:userId', characterController.drawCharacter);

module.exports = router;

