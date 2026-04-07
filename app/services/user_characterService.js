const db = require('../db');

// 캐릭터 강화
exports.enhanceCharacter = async (userId, characterId, consumedShard) => {
    // 1. 커넥션 가져오기 및 트랜잭션 시작
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // [검증] 유저가 충분한 조각을 가지고 있는지 확인
        const [shardRows] = await connection.query(
            'SELECT amount FROM user_character_shards WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );

        if (shardRows.length === 0 || shardRows[0].amount < consumedShard) {
            throw new Error('조각이 부족합니다.');
        }

        // 2. 조각 차감 (Update Shards)
        await connection.query(
            'UPDATE user_character_shards SET amount = amount - ? WHERE user_id = ? AND character_id = ?',
            [consumedShard, userId, characterId]
        );

        // 3. 캐릭터 레벨/강화도 상승 (Update Character)
        // 여기서는 예시로 enhance 수치를 1 올립니다.
        await connection.query(
            'UPDATE user_characters SET enhance = enhance + 1 WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );

        // 4. 모든 작업 성공 시 확정(Commit)
        await connection.commit();
        return { success: true, message: '강화 성공!' };

    } catch (err) {
        // 하나라도 실패하면 모든 작업을 되돌림(Rollback)
        await connection.rollback();
        throw err;
    } finally {
        // 커넥션 반납
        connection.release();
    }
};
