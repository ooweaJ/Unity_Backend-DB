const db = require('../db');
const userService = require('./userService');

const LEVEL_PER_STAGE = 10;
const ENHANCE_PER_STAGE = 2;

// 아이템 장착
exports.equipItem = async (userId, characterId, itemId, slotType) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        // 1. 아이템 보유 확인
        const [itemRows] = await conn.query(
            'SELECT item_id FROM user_items WHERE user_id = ? AND item_id = ? AND amount > 0',
            [userId, itemId]
        );
        if (itemRows.length === 0) throw new Error('아이템을 보유하고 있지 않습니다.');

        // 2. 아이템 타입 및 슬롯 적합성 확인
        const [gameItems] = await conn.query(
            'SELECT type, slot_type FROM game_items WHERE item_id = ?',
            [itemId]
        );
        if (gameItems.length === 0 || gameItems[0].type !== 'equipment' || gameItems[0].slot_type !== slotType) {
            throw new Error('장착 가능한 아이템이 아니거나 슬롯이 일치하지 않습니다.');
        }

        // 3. 기존 슬롯 아이템 해제 (있다면 인벤토리로 반환)
        const [existing] = await conn.query(
            'SELECT item_id FROM equipped_items WHERE user_id = ? AND character_id = ? AND slot_type = ?',
            [userId, characterId, slotType]
        );
        if (existing.length > 0) {
            await conn.query(
                'INSERT INTO user_items (user_id, item_id, amount) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE amount = amount + 1',
                [userId, existing[0].item_id]
            );
        }

        // 4. 장착 정보 업데이트 (REPLACE 사용)
        await conn.query(
            'REPLACE INTO equipped_items (user_id, character_id, slot_type, item_id) VALUES (?, ?, ?, ?)',
            [userId, characterId, slotType, itemId]
        );

        // 5. 인벤토리에서 장착한 아이템 1개 감소
        await conn.query(
            'UPDATE user_items SET amount = amount - 1 WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );
        await conn.query('DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0', [userId, itemId]);

        await conn.commit();
        return await userService.fetchFullUserData(userId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 아이템 장착 해제
exports.unequipItem = async (userId, characterId, slotType) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const [existing] = await conn.query(
            'SELECT item_id FROM equipped_items WHERE user_id = ? AND character_id = ? AND slot_type = ?',
            [userId, characterId, slotType]
        );
        if (existing.length === 0) throw new Error('해당 슬롯에 장착된 아이템이 없습니다.');

        const itemId = existing[0].item_id;

        // 1. 장착 테이블에서 삭제
        await conn.query(
            'DELETE FROM equipped_items WHERE user_id = ? AND character_id = ? AND slot_type = ?',
            [userId, characterId, slotType]
        );

        // 2. 인벤토리로 반환
        await conn.query(
            'INSERT INTO user_items (user_id, item_id, amount) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE amount = amount + 1',
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

// 아이템 사용 (EXP 포션, 강화 재료)
exports.useItem = async (userId, itemId, characterId) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        // 1. 아이템 확인
        const [itemRows] = await conn.query(
            'SELECT item_id, amount FROM user_items WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );
        if (itemRows.length === 0 || itemRows[0].amount <= 0) throw new Error('아이템이 없습니다.');

        const [gameItems] = await conn.query(
            'SELECT type, effect_value FROM game_items WHERE item_id = ?',
            [itemId]
        );
        const item = gameItems[0];

        // 2. 캐릭터 확인 및 현재 성장 캡 계산
        const [charRows] = await conn.query(`
            SELECT uc.*, gc.base_max_level, gc.base_max_enhance 
            FROM user_characters uc 
            JOIN game_characters gc ON uc.character_id = gc.character_id 
            WHERE uc.user_id = ? AND uc.character_id = ?`,
            [userId, characterId]
        );
        if (charRows.length === 0) throw new Error('캐릭터를 찾을 수 없습니다.');
        const char = charRows[0];

        const currentMaxLevel = char.base_max_level + (char.transcend_stage * LEVEL_PER_STAGE);
        const currentMaxEnhance = char.base_max_enhance + (char.transcend_stage * ENHANCE_PER_STAGE);

        if (item.type === 'exp_potion') {
            if (char.level >= currentMaxLevel) throw new Error('이미 현재 초월 단계의 최대 레벨입니다.');

            // 레벨업 로직 (단순화: 100 EXP당 1레벨)
            let newExp = char.exp + item.effect_value;
            let newLevel = char.level;
            const expNext = 100; 

            while (newExp >= expNext && newLevel < currentMaxLevel) {
                newExp -= expNext;
                newLevel++;
            }
            await conn.query(
                'UPDATE user_characters SET level = ?, exp = ? WHERE user_id = ? AND character_id = ?',
                [newLevel, newExp, userId, characterId]
            );

        } else if (item.type === 'enhance_mat') {
            if (char.enhance >= currentMaxEnhance) throw new Error('이미 최대 강화 상태입니다.');

            await conn.query(
                'UPDATE user_characters SET enhance = enhance + 1 WHERE user_id = ? AND character_id = ?',
                [userId, characterId]
            );
        } else {
            throw new Error('사용 가능한 아이템 타입이 아닙니다.');
        }

        // 3. 아이템 소모
        await conn.query(
            'UPDATE user_items SET amount = amount - 1 WHERE user_id = ? AND item_id = ?',
            [userId, itemId]
        );
        await conn.query('DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0', [userId, itemId]);

        await conn.commit();
        return await userService.fetchFullUserData(userId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// 캐릭터 초월
exports.transcendCharacter = async (userId, characterId) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        // 1. 캐릭터 상태 확인
        const [charRows] = await conn.query(`
            SELECT uc.*, gc.base_max_level, gc.base_max_enhance, gc.transcend_material_id
            FROM user_characters uc 
            JOIN game_characters gc ON uc.character_id = gc.character_id 
            WHERE uc.user_id = ? AND uc.character_id = ?`,
            [userId, characterId]
        );
        if (charRows.length === 0) throw new Error('캐릭터를 찾을 수 없습니다.');
        const char = charRows[0];

        const currentMaxLevel = char.base_max_level + (char.transcend_stage * LEVEL_PER_STAGE);
        const currentMaxEnhance = char.base_max_enhance + (char.transcend_stage * ENHANCE_PER_STAGE);

        // 2. '풀강' 여부 확인
        if (char.level < currentMaxLevel || char.enhance < currentMaxEnhance) {
            throw new Error('최대 레벨 및 최대 강화 상태여야 초월이 가능합니다.');
        }

        // 3. 초월 재료 확인
        const [matRows] = await conn.query(
            'SELECT amount FROM user_items WHERE user_id = ? AND item_id = ?',
            [userId, char.transcend_material_id]
        );
        if (matRows.length === 0 || matRows[0].amount <= 0) {
            throw new Error('초월 재료가 부족합니다.');
        }

        // 4. 초월 단계 상승 및 재료 소모
        await conn.query(
            'UPDATE user_characters SET transcend_stage = transcend_stage + 1 WHERE user_id = ? AND character_id = ?',
            [userId, characterId]
        );
        await conn.query(
            'UPDATE user_items SET amount = amount - 1 WHERE user_id = ? AND item_id = ?',
            [userId, char.transcend_material_id]
        );
        await conn.query('DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0', [userId, char.transcend_material_id]);

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
    await db.query('DELETE FROM user_items WHERE user_id = ? AND item_id = ? AND amount <= 0', [userId, itemId]);
    return await userService.fetchFullUserData(userId);
};
