const db = require('../db');

const MAX_TRANSCEND = 5;
const LEVEL_BONUS_PER_STAGE = 2;

// 캐릭터 초월
// N초월에 조각 N개 소모, 100% 성공, 최대 5단계
exports.transcendCharacter = async (userId, characterId) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [charRows] = await conn.query(`
            SELECT uc.enhance, gc.base_max_level
            FROM user_characters uc
            JOIN game_characters gc ON uc.character_id = gc.character_id
            WHERE uc.user_id = ? AND uc.character_id = ?`,
            [userId, characterId]
        );
        if (charRows.length === 0) throw new Error('보유하지 않은 캐릭터입니다.');

        const currentStage = charRows[0].enhance;
        const baseMaxLevel = charRows[0].base_max_level;

        if (currentStage >= MAX_TRANSCEND) throw new Error('이미 최대 초월 단계입니다.');

        const nextStage = currentStage + 1;
        const shardsRequired = nextStage;

        const [shardRows] = await conn.query(
            'SELECT amount FROM user_character_shards WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );
        const currentShards = shardRows.length > 0 ? shardRows[0].amount : 0;
        if (currentShards < shardsRequired) {
            throw new Error(`조각이 부족합니다. 필요: ${shardsRequired}개, 보유: ${currentShards}개`);
        }

        await conn.query(
            'UPDATE user_character_shards SET amount = amount - ? WHERE user_id = ? AND character_id = ?',
            [shardsRequired, userId, characterId]
        );

        await conn.query(
            'UPDATE user_characters SET enhance = enhance + 1 WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );

        await conn.commit();

        const newMaxLevel = baseMaxLevel + (nextStage * LEVEL_BONUS_PER_STAGE);
        return {
            success: true,
            transcendStage: nextStage,
            newMaxLevel,
            shardsUsed: shardsRequired
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
