const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.post('/equip', inventoryController.equipItem);
router.post('/unequip', inventoryController.unequipItem);
router.post('/use', inventoryController.useItem);
router.post('/discard', inventoryController.discardItem);

module.exports = router;
