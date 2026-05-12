const db = require('../db');

const MAX_TRANSCEND = 5;
const LEVEL_BONUS_PER_STAGE = 2;

// 캐릭터 초월
// shardsToUse / shardsRequired 확률 판정, 사용한 조각만 소모
// shardsRequired = nextStage (1초월→1개, 2초월→2개, ...)
exports.transcendCharacter = async (userId, characterId, shardsToUse) => {
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

        const nextStage      = currentStage + 1;
        const shardsRequired = nextStage;

        if (!shardsToUse || shardsToUse < 1 || shardsToUse > shardsRequired) {
            throw new Error(`투입 가능한 조각 수는 1~${shardsRequired}개입니다.`);
        }

        const [shardRows] = await conn.query(
            'SELECT amount FROM user_character_shards WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );
        const currentShards = shardRows.length > 0 ? shardRows[0].amount : 0;
        if (currentShards < shardsToUse) {
            throw new Error(`조각이 부족합니다. 필요: ${shardsToUse}개, 보유: ${currentShards}개`);
        }

        // 조각 소모 (실패해도 소모)
        await conn.query(
            'UPDATE user_character_shards SET amount = amount - ? WHERE user_id = ? AND character_id = ?',
            [shardsToUse, userId, characterId]
        );

        // 확률 판정
        const successRate     = shardsToUse / shardsRequired;
        const transcendSuccess = Math.random() < successRate;

        if (transcendSuccess) {
            await conn.query(
                'UPDATE user_characters SET enhance = enhance + 1 WHERE user_id = ? AND character_id = ?',
                [userId, characterId]
            );
        }

        await conn.commit();

        const resultStage = transcendSuccess ? nextStage : currentStage;
        return {
            success: true,
            transcendSuccess,
            transcendStage: resultStage,
            newMaxLevel: baseMaxLevel + (resultStage * LEVEL_BONUS_PER_STAGE),
            shardsUsed: shardsToUse
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
