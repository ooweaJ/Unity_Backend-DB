const db = require('../db');

exports.login = async (username, password) => {
    const [rows] = await db.query(
        'SELECT id, username, level, gold FROM users WHERE username=? AND password=?', 
        [username, password]
    );
    return rows[0] || null;
};

exports.getUserInfo = async (userId) => {
    const [rows] = await db.query(
        'SELECT id, username, level, gold FROM users WHERE id=?', 
        [userId]
    );
    return rows[0];
};

