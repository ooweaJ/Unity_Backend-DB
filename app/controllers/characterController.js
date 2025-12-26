const characterService = require('../services/characterService');

exports.drawCharacter = async (req, res) => {
    const result = await characterService.drawCharacter(req.params.userId);
    if(result.error) res.json({ message: result.error });
    else res.json({ message: 'Draw success', character: result.character, gold: result.gold });
};
