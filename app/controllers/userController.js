const userService = require('../services/userService');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await userService.login(username, password);
    if(user) res.json({ message: 'Login success', user });
    else res.json({ message: 'Login failed' });
};

exports.getUserInfo = async (req, res) => {
    const userId = req.params.userId;
    try {
        const userData = await userService.fetchFullUserData(userId);
        return res.json({ success: true, ...userData });
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};