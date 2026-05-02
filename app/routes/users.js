const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.get('/:userId', userController.getUserInfo);
router.post('/:userId/battle-result', userController.postBattleResult);
router.post('/:userId/select-character', userController.postSelectCharacter);
router.post('/:userId/transcend', userController.postTranscend);

module.exports = router;
