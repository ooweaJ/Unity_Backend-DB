const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.get('/:id', userController.getUserInfo);
router.post('/:userId/battle-result', userController.postBattleResult);
router.post('/:userId/select-character', userController.postSelectCharacter);
router.post('/:userId/enhance', userController.postEnhance);

module.exports = router;

