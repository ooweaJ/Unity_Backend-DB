const userService = require('../services/userService');
const characterService = require("../services/characterService");

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await userService.login(username, password);
    if(user) res.json({ message: 'Login success', user });
    else res.json({ message: 'Login failed' });
};

exports.getUserInfo = async (req, res) => {
    const user = await userService.getUserInfo(req.params.id);
    res.json(user);
};

exports.getUserCharacters = async (req, res) => {
    const userId = req.params.userId;

    try {
        const characters = await characterService.getUserCharacters(userId);

        return res.json({
            success: true,
            characters
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
