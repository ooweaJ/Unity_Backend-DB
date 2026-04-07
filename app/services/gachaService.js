// services/gachaService.js
const db = require('../db');

const GACHA_COST = 100; // 1회 비용

exports.drawGacha = async (userId, bannerId, amount) => {

    // ── 1. 유저 골드 확인 ─────────────────────────────
    const [userRows] = await db.query(
        'SELECT gold FROM users WHERE id = ?', [userId]
    );
    if (userRows.length === 0)
        throw new Error('User not found');

    const totalCost = GACHA_COST * amount;
    if (userRows[0].gold < totalCost)
        throw new Error('Not enough gold');

    // ── 2. 배너 유효성 확인 (기간 체크) ──────────────
    const [bannerRows] = await db.query(
        `SELECT * FROM banners
         WHERE banner_id = ?
         AND NOW() BETWEEN start_at AND end_at`,
        [bannerId]
    );
    if (bannerRows.length === 0)
        throw new Error('Banner not found or expired');

    // ── 3. 골드 차감 ──────────────────────────────────
    await db.query(
        'UPDATE users SET gold = gold - ? WHERE id = ?',
        [totalCost, userId]
    );

    // ── 4. amount 횟수만큼 뽑기 ──────────────────────
    const results = [];
    for (let i = 0; i < amount; i++) {
        const result = await pullOnce(userId, bannerId);
        results.push(result);
    }

    return results;
};

// ── 1회 뽑기 ──────────────────────────────────────────
async function pullOnce(userId, bannerId) {

    // STEP 1. 확률 구성 (Base + Override)
    const rates = await buildRates(bannerId);

    // STEP 2. 등급 추첨
    const grade = rollGrade(rates);

    // STEP 3. 보상 풀 구성 (Base + Pickup - Exclude)
    const pool = await buildPool(bannerId, grade);

    // STEP 4. 보상 선택
    const reward = pool[Math.floor(Math.random() * pool.length)];

    // STEP 5. 유저 DB에 저장 + 결과 반환
    return await saveAndReturn(userId, grade, reward);
}

// ── 확률 구성 ──────────────────────────────────────────
async function buildRates(bannerId) {
    const [base] = await db.query(
        'SELECT grade, rate FROM base_gacha_rates'
    );
    const [overrides] = await db.query(
        'SELECT grade, override_rate FROM banner_tier_override WHERE banner_id = ?',
        [bannerId]
    );

    // Base 확률 맵으로 변환
    const rateMap = {};
    base.forEach(r => rateMap[r.grade] = parseFloat(r.rate));

    // Override 적용 (있는 등급만 덮어씌움)
    overrides.forEach(o => rateMap[o.grade] = parseFloat(o.override_rate));

    return rateMap;
}

// ── 등급 추첨 ──────────────────────────────────────────
function rollGrade(rateMap) {
    const rand = Math.random();
    let cumulative = 0;

    // 낮은 등급부터 (1=노말 → 4=전설)
    for (let grade = 1; grade <= 4; grade++) {
        cumulative += (rateMap[grade] || 0);
        if (rand < cumulative) return grade;
    }
    return 1;
}

// ── 보상 풀 구성 ───────────────────────────────────────
async function buildPool(bannerId, grade) {
    // Base 풀 (game_characters 참조)
    const [base] = await db.query(
        'SELECT type_id, reward_id FROM base_reward_pool WHERE grade = ?',
        [grade]
    );

    // Pickup 추가
    const [pickups] = await db.query(
        'SELECT type_id, reward_id FROM banner_pickup WHERE banner_id = ? AND grade = ?',
        [bannerId, grade]
    );

    // Exclude 제거
    const [excludes] = await db.query(
        'SELECT reward_id FROM banner_exclude WHERE banner_id = ? AND grade = ?',
        [bannerId, grade]
    );
    const excludeSet = new Set(excludes.map(e => e.reward_id));

    const pool = [
        ...base.filter(r => !excludeSet.has(r.reward_id)),
        ...pickups
    ];

    if (pool.length === 0)
        throw new Error(`Empty pool: bannerId=${bannerId} grade=${grade}`);

    return pool;
}

// ── 유저 DB 저장 + 결과 반환 ───────────────────────────
async function saveAndReturn(userId, grade, reward) {
    const { type_id, reward_id } = reward;

    if (type_id === 1) {
        const [owned] = await db.query(
            'SELECT id FROM user_characters WHERE user_id = ? AND character_id = ?',
            [userId, reward_id]
        );

        if (owned.length === 0) {
            // 신규 획득 → user_characters에 추가
            await db.query(
                `INSERT INTO user_characters (user_id, character_id, level, exp, enhance)
                 VALUES (?, ?, 1, 0, 0)`,
                [userId, reward_id]
            );
            return { grade, typeId: type_id, rewardId: reward_id, resultType: 'character' };

        } else {
            // 중복 → user_character_shards amount +1
            await db.query(
                `INSERT INTO user_character_shards (user_id, character_id, amount)
                 VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE amount = amount + 1`,
                [userId, reward_id]
            );
            return { grade, typeId: type_id, rewardId: reward_id, resultType: 'shard' };
        }
    }

    if (type_id === 2) {
        await db.query(
            `INSERT INTO user_items (user_id, item_id, amount)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE amount = amount + 1`,
            [userId, reward_id]
        );
        return { grade, typeId: type_id, rewardId: reward_id, resultType: 'item' };
    }

    throw new Error(`Unknown type_id: ${type_id}`);
}
