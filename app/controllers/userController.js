const userService = require('../services/userService');
const userCharService = require('../services/user_characterService');

// 로그인
exports.login = async (req, res) => {
    const { username, password } = req.body;
    const userData = await userService.login(username, password);
    if (userData) res.json({ message: 'Login success', userData });
    else res.json({ message: 'Login failed' });
};

// 유저 정보 조회
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

// 전투 승리 후 경험치 지급
exports.postBattleResult = async (req, res) => {
    const userId = req.params.userId;
    const { gainedExp } = req.body;
    if (!gainedExp || gainedExp <= 0) {
        return res.json({ success: false, message: '유효하지 않은 경험치 값입니다.' });
    }
    try {
        const result = await userService.addBattleExp(userId, gainedExp);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};

// 선택 캐릭터 저장
exports.postSelectCharacter = async (req, res) => {
    const userId = req.params.userId;
    const { characterId } = req.body;
    try {
        const result = await userService.selectCharacter(userId, characterId);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};

// 캐릭터 초월
exports.postTranscend = async (req, res) => {
    const userId = req.params.userId;
    const { characterId } = req.body;
    try {
        const result = await userCharService.transcendCharacter(userId, characterId);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};
