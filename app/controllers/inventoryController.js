const inventoryService = require('../services/inventoryService');

exports.equipItem = async (req, res) => {
    try {
        const { userId, characterId, equipInstanceId, slotType } = req.body;
        const user = await inventoryService.equipItem(userId, characterId, equipInstanceId, slotType);
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

exports.unequipItem = async (req, res) => {
    try {
        const { userId, characterId, slotType } = req.body;
        const user = await inventoryService.unequipItem(userId, characterId, slotType);
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

exports.useItem = async (req, res) => {
    try {
        const { userId, itemId, characterId } = req.body;
        const user = await inventoryService.useItem(userId, itemId, characterId);
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};

exports.discardItem = async (req, res) => {
    try {
        const { userId, itemId, amount } = req.body;
        const user = await inventoryService.discardItem(userId, itemId, amount);
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
};
