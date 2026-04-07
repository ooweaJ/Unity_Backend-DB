const db = require('../db');

// 로그인
exports.login = async (username, password) => {
    const [rows] = await db.query(
        'SELECT id, username, level, gold FROM users WHERE username=? AND password=?', 
        [username, password]
    );
    return rows[0] || null;
};

// 유저 정보 반환
exports.fetchFullUserData = async (userId) => {
    // 1. 유저 기본 정보 조회
    const [userRows] = await db.query('SELECT id, username, gold FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) throw new Error('User not found');

    // 2. 캐릭터 + 조각 정보 조회
    const [characters] = await db.query(`
        SELECT uc.character_id, uc.level, uc.exp, uc.enhance, COALESCE(ucs.amount, 0) AS shardAmount
        FROM user_characters uc
        LEFT JOIN user_character_shards ucs ON uc.user_id = ucs.user_id AND uc.character_id = ucs.character_id
        WHERE uc.user_id = ?`, [userId]);

    // 3. 아이템 정보 조회
    const [items] = await db.query('SELECT item_id, count FROM user_items WHERE user_id = ?', [userId]);

    return {
        id: userRows[0].id,
        username: userRows[0].username,
        gold: userRows[0].gold,
        characters,
        items
    };
};
