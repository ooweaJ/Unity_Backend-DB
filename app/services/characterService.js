const db = require('../db');

exports.getUserCharacters = async (userId) => {
    const [rows] = await db.query(
        `
        SELECT
            character_id,
            level,
            exp,
            enhance
        FROM user_characters
        WHERE user_id = ?
        `,
        [userId]
    );

    return rows.map(r => ({
        characterId: r.character_id,
        level: r.level,
        exp: r.exp,
        enhance: r.enhance
    }));
};
