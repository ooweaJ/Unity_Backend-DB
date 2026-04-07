const express = require('express');
const router = express.Router();
const redis = require('../services/redisClient');

const BATTLE_PORTS = [7778, 7779, 7780];

// 포트 획득 (매칭 시 로비서버가 호출)
router.post('/acquire', async (req, res) => {
    for (const port of BATTLE_PORTS) {
        const status = await redis.get(`battle:${port}`);
        if (!status || status === 'idle') {
            await redis.setex(`battle:${port}`, 300, 'inuse'); // TTL 30분
            return res.json({ success: true, port });
        }
    }
    res.json({ success: false, message: 'No available servers' });
});

// 포트 반환 (배틀 종료 시 배틀서버가 호출)
router.post('/release', async (req, res) => {
    const { port } = req.body;
    await redis.set(`battle:${port}`, 'idle');
    res.json({ success: true, port });
});

module.exports = router;
