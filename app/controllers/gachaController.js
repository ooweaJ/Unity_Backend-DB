// controllers/gachaController.js
const gachaService = require('../services/gachaService');

exports.gachaDraw = async (req, res) => {
    const userId   = req.params.userId;
    const bannerId = req.body.bannerId;  // 추가
    const amount   = req.body.amount || 1;  // 추가 (기본 1회)

    if (!bannerId)
        return res.json({ success: false, message: 'bannerId required' });

    try {
        const results = await gachaService.drawGacha(userId, bannerId, amount);
        return res.json({ success: true, results });
    } catch (err) {
        console.log(err);
        return res.json({ success: false, message: err.message });
    }
};
