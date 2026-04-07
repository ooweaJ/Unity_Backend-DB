const userService = require('../services/userService');
const userCharService = require('../services/user_characterService');

// 로그인
exports.login = async (req, res) => {
    const { username, password } = req.body;
    const userData = await userService.login(username, password);
    if(userData) res.json({ message: 'Login success', userData });
    else res.json({ message: 'Login failed' });
};

// 유저 정보 얻기
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

// 캐릭터 강화
exports.postEnhance = async (req, res) => {
    const userId = req.params.userId;
    const { characterId, consumedShard } = req.body;

    try {
        const result = await userCharService.enhanceCharacter(userId, characterId, consumedShard);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};