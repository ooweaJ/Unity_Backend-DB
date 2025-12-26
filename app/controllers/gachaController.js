// controllers/gachaController.js
const gachaService = require("../services/gachaService");

exports.gachaDraw = async (req, res) => {
    const userId = req.params.userId;

    try {
        const result = await gachaService.drawCharacter(userId);
        return res.json(result);

    } catch (err) {
        console.log(err);
        return res.json({ success: false, message: "Server error" });
    }
};

