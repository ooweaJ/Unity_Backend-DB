const db = require('../db');

// 로그인
exports.login = async (username, password) => {
    // 1. 최소한의 정보(id)만 조회해서 인증 여부 확인
    const [rows] = await db.query(
        'SELECT id FROM users WHERE username = ? AND password = ?', 
        [username, password]
    );

    if (rows.length > 0) {
        const userId = rows[0].id;

        // 2. 인증 성공! 모든 데이터 조립은 이 함수 하나에 맡깁니다.
        // 여기서 id, username, level, gold, characters, items가 한꺼번에 조립됨
        const fullData = await exports.fetchFullUserData(userId);
        
        return fullData; 
    }

    return null; // 로그인 실패
};

// 유저 정보 반환
exports.fetchFullUserData = async (userId) => {
    // 1. 유저 기본 정보 조회
    const [userRows] = await db.query('SELECT id, username, level, gold, gem FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) throw new Error('User not found');

    // 2. 캐릭터 + 조각 정보 조회
    const [characters] = await db.query(`
        SELECT uc.character_id, uc.level, uc.exp, uc.enhance, COALESCE(ucs.amount, 0) AS shardAmount
        FROM user_characters uc
        LEFT JOIN user_character_shards ucs ON uc.user_id = ucs.user_id AND uc.character_id = ucs.character_id
        WHERE uc.user_id = ?`, [userId]);

    // 3. 아이템 정보 조회
    const [items] = await db.query('SELECT item_id, amount FROM user_items WHERE user_id = ?', [userId]);

    return {
        id: userRows[0].id,
        username: userRows[0].username,
        level: userRows[0].level,
        gold: userRows[0].gold,
        gem: userRows[0].gem,
        characters,
        items
    };
};
