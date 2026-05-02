const db = require('../db');

const MAX_ENHANCE = 8;

// 장비 강화
// 골드 소모 + 확률, 실패 시 골드만 소비 (강화 수치 유지)
exports.enhanceEquipment = async (userId, equipInstanceId) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [instanceRows] = await conn.query(
            'SELECT id, enhance FROM user_items_equipment WHERE id = ? AND user_id = ? FOR UPDATE',
            [equipInstanceId, userId]
        );
        if (instanceRows.length === 0) throw new Error('보유하지 않은 장비입니다.');

        const currentEnhance = instanceRows[0].enhance;
        if (currentEnhance >= MAX_ENHANCE) throw new Error('이미 최대 강화 상태입니다 (+8).');

        const [rateRows] = await conn.query(
            'SELECT success_rate, gold_cost FROM equipment_enhance_rates WHERE from_enhance = ?',
            [currentEnhance]
        );
        if (rateRows.length === 0) throw new Error('강화 정보를 찾을 수 없습니다.');

        const { success_rate, gold_cost } = rateRows[0];

        const [userRows] = await conn.query(
            'SELECT gold FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        if (userRows[0].gold < gold_cost) {
            throw new Error(`골드가 부족합니다. 필요: ${gold_cost}, 보유: ${userRows[0].gold}`);
        }

        await conn.query(
            'UPDATE users SET gold = gold - ? WHERE id = ?',
            [gold_cost, userId]
        );

        const success = Math.random() < success_rate;

        if (success) {
            await conn.query(
                'UPDATE user_items_equipment SET enhance = enhance + 1 WHERE id = ?',
                [equipInstanceId]
            );
        }

        await conn.commit();
        return {
            success: true,
            enhanced: success,
            enhance: success ? currentEnhance + 1 : currentEnhance,
            goldCost: gold_cost,
            successRate: success_rate
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
