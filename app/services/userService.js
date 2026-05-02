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
    const [userRows] = await db.query(
        'SELECT id, username, level, exp, gold, gem, selected_character_id FROM users WHERE id = ?',
        [userId]
    );
    if (userRows.length === 0) throw new Error('User not found');

    // 2. 캐릭터 + 조각 정보 조회 (초월 단계 포함)
    const [characters] = await db.query(`
        SELECT uc.character_id, uc.level, uc.exp, uc.enhance, uc.transcend_stage, 
               COALESCE(ucs.amount, 0) AS shardAmount
        FROM user_characters uc
        LEFT JOIN user_character_shards ucs ON uc.user_id = ucs.user_id AND uc.character_id = ucs.character_id
        WHERE uc.user_id = ?`, [userId]);

    // 3. 장착 아이템 조회
    const [equipped] = await db.query('SELECT character_id, slot_type, item_id FROM equipped_items WHERE user_id = ?', [userId]);

    // 캐릭터별 장착 정보 매핑
    characters.forEach(c => {
        c.equipped_items = equipped
            .filter(e => e.character_id === c.character_id)
            .map(e => ({ slot_type: e.slot_type, item_id: e.item_id }));
    });

    // 4. 아이템 정보 조회
    const [items] = await db.query('SELECT item_id, amount FROM user_items WHERE user_id = ?', [userId]);

    return {
        id: userRows[0].id,
        username: userRows[0].username,
        level: userRows[0].level,
        exp: userRows[0].exp,
        gold: userRows[0].gold,
        gem: userRows[0].gem,
        selected_character_id: userRows[0].selected_character_id,
        characters,
        items
    };
};

// 레벨업에 필요한 경험치: level * 100
const expRequired = (level) => level * 100;

// 전투 승리 후 경험치 지급 및 레벨업 처리
exports.addBattleExp = async (userId, gainedExp) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [rows] = await conn.query(
            'SELECT level, exp FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        if (rows.length === 0) throw new Error('User not found');

        let { level, exp } = rows[0];
        exp += gainedExp;
        let leveledUp = false;

        // 누적 경험치가 요구량을 넘는 동안 계속 레벨업
        while (exp >= expRequired(level)) {
            exp -= expRequired(level);
            level += 1;
            leveledUp = true;
        }

        await conn.query(
            'UPDATE users SET level = ?, exp = ? WHERE id = ?',
            [level, exp, userId]
        );

        await conn.commit();
        return { success: true, level, exp, leveledUp };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 유저가 선택한 캐릭터 저장
exports.selectCharacter = async (userId, characterId) => {
    // 유저가 해당 캐릭터를 보유 중인지 검증
    const [rows] = await db.query(
        'SELECT 1 FROM user_characters WHERE user_id = ? AND character_id = ?',
        [userId, characterId]
    );
    if (rows.length === 0) throw new Error('보유하지 않은 캐릭터입니다.');

    await db.query(
        'UPDATE users SET selected_character_id = ? WHERE id = ?',
        [characterId, userId]
    );
    return { success: true, selected_character_id: characterId };
};
