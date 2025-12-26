// services/gachaService.js
const db = require("../db");

const DUPLICATE_SHARD_AMOUNT = 1; // 중복 시 지급 shard 수

exports.drawCharacter = async (userId) => {
    // 1️⃣ 골드 확인
    const [userRows] = await db.query(
        "SELECT gold FROM users WHERE id=?",
        [userId]
    );

    if (userRows.length === 0)
        return { success: false, message: "User not found" };

    if (userRows[0].gold < 100)
        return { success: false, message: "Not enough gold" };

    // 2) 골드 차감
    await db.query("UPDATE users SET gold = gold - 100 WHERE id=?", [userId]);

    // 3) 확률 테이블 불러오기
    const [probs] = await db.query("SELECT * FROM gacha_probabilities");

    const rand = Math.random() * 100;
    let sum = 0;
    let selectedRarity = null;

    for (let p of probs) {
        sum += p.percent; 
        if (rand <= sum) {
            selectedRarity = p.rarity;
            break;
        }
    }

    if (!selectedRarity)
        return { success: false, message: "Probability error" };

    // 4) 해당 rarity의 캐릭터 중 하나 선택
    const [rows] = await db.query(
        "SELECT id FROM game_characters WHERE rarity=? ORDER BY RAND() LIMIT 1",
        [selectedRarity]
    );

    if (rows.length === 0)
        return { success: false, message: "No character found for rarity" };

    const characterId = rows[0].id;

    // 4️⃣ 이미 캐릭터 소유했는지 확인
    const [owned] = await db.query(
        `
        SELECT 1 FROM user_characters
        WHERE user_id=? AND character_id=?
        `,
        [userId, characterId]
    );


    // 5️⃣ 분기 처리
    if (owned.length === 0) {
        // ✅ 신규 캐릭터
        await db.query(
            `
            INSERT INTO user_characters
            (user_id, character_id, level, exp, enhance)
            VALUES (?, ?, 1, 0, 0)
            `,
            [userId, characterId]
        );

        return {
            success: true,
            resultType: "character",
            characterId
        };
    } else {
        // 🔮 중복 → shard 지급
        await db.query(
            `
            INSERT INTO user_character_shards (user_id, character_id, amount)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE amount = amount + ?
            `,
            [userId, characterId, DUPLICATE_SHARD_AMOUNT, DUPLICATE_SHARD_AMOUNT]
        );

        return {
            success: true,
            resultType: "shard",
            characterId,
            shardAmount: DUPLICATE_SHARD_AMOUNT
        };
    }
};

