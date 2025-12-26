const express = require('express');
const router = express.Router();
const { gachaDraw } = require('../controllers/gachaController');

router.post('/draw/:userId', gachaDraw);

module.exports = router;

