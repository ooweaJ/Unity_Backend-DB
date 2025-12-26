const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.get('/:id', userController.getUserInfo);
router.get("/:userId/characters", userController.getUserCharacters);

module.exports = router;

