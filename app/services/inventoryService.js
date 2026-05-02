const db = require('../db');
const userService = require('./userService');

const LEVEL_BONUS_PER_TRANSCEND = 2;

// 장비 장착
// equipInstanceId: user_items_equipment.id
exports.equipItem = async (userId, characterId, equipInstanceId, slotType) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        // 1. 장비 인스턴스 보유 확인 + 슬롯 타입 검증
        const [instanceRows] = await conn.query(`
            SELECT uie.id, gi.slot_type AS item_slot_type
            FROM user_items_equipment uie
            JOIN game_items gi ON uie.item_id = gi.item_id
            WHERE uie.id = ? AND uie.user_id = ?`,
            [equipInstanceId, userId]
        );
        if (instanceRows.length === 0) throw new Error('보유하지 않은 장비입니다.');

        const itemSlotType = instanceRows[0].item_slot_type;
        if (itemSlotType.toLowerCase() !== slotType.toLowerCase()) {
            throw new Error(`슬롯 타입 불일치 — 아이템: ${itemSlotType}, 요청: ${slotType}`);
        }

        // 2. 같은 슬롯에 이미 장착된 것이 있으면 교체
        //    기존 인스턴스는 user_items_equipment에 남아 있으므로 별도 반환 처리 불필요
        await conn.query(
            'REPLACE INTO equipped_items (user_id, character_id, slot_type, equip_instance_id) VALUES (?, ?, ?, ?)',
            [userId, characterId, slotType, equipInstanceId]
        );

        await conn.commit();
        return await userService.fetchFullUserData(userId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 장비 장착 해제
exports.unequipItem = async (userId, characterId, slotType) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const [existing] = await conn.query(
            'SELECT equip_instance_id FROM equipped_items WHERE user_id = ? AND character_id = ? AND slot_type = ?',
            [userId, characterId, slotType]
        );
        if (existing.length === 0) throw new Error('해당 슬롯에 장착된 장비가 없습니다.');

        await conn.query(
            'DELETE FROM equipped_items WHERE user_id = ? AND character_id = ? AND slot_type = ?',
            [userId, characterId, slotType]
        );

        await conn.commit();
        return await userService.fetchFullUserData(userId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 아이템 사용 (exp_potion만 지원)
exports.useItem = async (userId, itemId, characterId) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const [itemRows] = await conn.query(
            'SELECT item_id, amount FROM user_items WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );
        if (itemRows.length === 0 || itemRows[0].amount <= 0) throw new Error('아이템이 없습니다.');

        const [gameItems] = await conn.query(
            'SELECT type, effect_value FROM game_items WHERE item_id = ?',
            [itemId]
        );
        if (gameItems.length === 0) throw new Error('존재하지 않는 아이템입니다.');
        const item = gameItems[0];

        const [charRows] = await conn.query(`
            SELECT uc.level, uc.exp, uc.enhance, gc.base_max_level
            FROM user_characters uc
            JOIN game_characters gc ON uc.character_id = gc.character_id
            WHERE uc.user_id = ? AND uc.character_id = ?`,
            [userId, characterId]
        );
        if (charRows.length === 0) throw new Error('캐릭터를 찾을 수 없습니다.');
        const char = charRows[0];

        // 실제 최대 레벨 = base + (초월 단계 × 2)
        const currentMaxLevel = char.base_max_level + (char.enhance * LEVEL_BONUS_PER_TRANSCEND);

        if (item.type !== 'exp_potion') throw new Error('사용 가능한 아이템 타입이 아닙니다.');
        if (char.level >= currentMaxLevel) throw new Error('이미 현재 초월 단계의 최대 레벨입니다.');

        let newExp = char.exp + item.effect_value;
        let newLevel = char.level;

        while (newExp >= 100 && newLevel < currentMaxLevel) {
            newExp -= 100;
            newLevel++;
        }

        await conn.query(
            'UPDATE user_characters SET level = ?, exp = ? WHERE user_id = ? AND character_id = ?',
            [newLevel, newExp, userId, characterId]
        );

        await conn.query(
            'UPDATE user_items SET amount = amount - 1 WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );
        await conn.query(
            'DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0',
            [userId, itemId]
        );

        await conn.commit();
        return await userService.fetchFullUserData(userId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 아이템 버리기
exports.discardItem = async (userId, itemId, amount) => {
    await db.query(
        'UPDATE user_items SET amount = amount - ? WHERE user_id = ? AND item_id = ?',
        [amount, userId, itemId]
    );
    await db.query(
        'DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0',
        [userId, itemId]
    );
    return await userService.fetchFullUserData(userId);
};
