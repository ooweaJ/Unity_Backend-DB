const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// 아이템 장착
router.post('/equip', inventoryController.equipItem);

// 아이템 장착 해제
router.post('/unequip', inventoryController.unequipItem);

// 아이템 사용 (EXP 포션, 강화 재료)
router.post('/use', inventoryController.useItem);

// 아이템 버리기
router.post('/discard', inventoryController.discardItem);

// 캐릭터 초월
router.post('/transcend', inventoryController.transcendCharacter);

module.exports = router;
