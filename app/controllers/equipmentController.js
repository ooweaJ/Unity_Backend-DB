const equipmentService = require('../services/equipmentService');
const userService = require('../services/userService');

// 장비 강화 — 결과 + 전체 유저 데이터 반환 (클라이언트 ApplyServerResponse 통일 포맷)
exports.postEnhance = async (req, res) => {
    const userId = req.params.userId;
    const equipInstanceId = req.params.equipInstanceId;
    try {
        const result = await equipmentService.enhanceEquipment(userId, equipInstanceId);
        const user   = await userService.fetchFullUserData(userId);
        return res.json({ ...result, user });
    } catch (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
    }
};
