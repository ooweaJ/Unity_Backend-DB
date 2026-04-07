const express = require('express');
const router  = express.Router();
const { gachaDraw } = require('../controllers/gachaController');

// 기존: POST /draw/:userId
// 변경: bannerId, amount를 body로 받음
router.post('/draw/:userId', gachaDraw);

module.exports = router;
