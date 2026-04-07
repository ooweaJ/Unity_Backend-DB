const userService = require('../services/userService');
const characterService = require("../services/characterService");

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await userService.login(username, password);
    if(user) res.json({ message: 'Login success', user });
    else res.json({ message: 'Login failed' });
};

// controllers/userController.js

exports.getUserInfo = async (req, res) => {
    const userId = req.params.userId;

    try {
        // 1. 유저 기본 정보 (골드)
        const [userRows] = await db.query(
            'SELECT id, username, gold FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0)
            return res.json({ success: false, message: 'User not found' });

        // 2. 보유 캐릭터
        const [characters] = await db.query(
            'SELECT character_id, level, exp, enhance, shardAmount FROM user_characters WHERE user_id = ?',
            [userId]
        );

        // 3. 보유 아이템 (포션 등)
        const [items] = await db.query(
            'SELECT item_id, count FROM user_items WHERE user_id = ?',
            [userId]
        );

        // 4. 초월 구슬 (캐릭터별 amount)
        const [shards] = await db.query(
            'SELECT character_id, amount FROM user_character_shards WHERE user_id = ?',
            [userId]
        );

        res.json({
            success:    true,
            id:         userRows[0].id,
            username:   userRows[0].username,
            gold:       userRows[0].gold,
            characters: characters,
            items:      items,
            shards:     shards       // 추가
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: 'Server error' });
    }
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
