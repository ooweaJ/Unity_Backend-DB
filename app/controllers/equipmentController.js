const equipmentService = require('../services/equipmentService');

// 장비 강화
exports.postEnhance = async (req, res) => {
    const userId = req.params.userId;
    const equipInstanceId = req.params.equipInstanceId;
    try {
        const result = await equipmentService.enhanceEquipment(userId, equipInstanceId);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};
