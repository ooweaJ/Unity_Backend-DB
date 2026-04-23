# Project Progress Log: Inventory & Character Progression

## Current Status (2026-04-23)
The inventory and character progression backend has been implemented. Database schema updates are pending migration.

### ✅ Completed Tasks
- **Database Schema**: Refactored `db/index.js` to include new growth columns (`transcend_stage`, etc.) and `equipped_items` table.
- **User Data**: Updated `userService.js` to fetch full character state including equipment.
- **Inventory Services**: Created `inventoryService.js` with:
    - `equipItem`/`unequipItem`: Transactional equipment management.
    - `useItem`: EXP Potions / Enhance Materials usage with current-stage Max Cap checks.
    - `transcendCharacter`: Condition check (Max Level + Max Enhance) and transcendence material consumption.
- **API Endpoints**: Registered routes in `server.js` via `inventoryController.js`.
- **Unity Client**: Updated `BackendManager.cs` to match the new `UseItem` signature with `characterId`.

### ⏳ Pending Tasks / To Verify
- **DB Migration**: Run `node migrate.js` to apply changes to existing tables.
- **Data Insertion**: Need to insert sample data into `game_characters` and `game_items` (with correct types like 'exp_potion', 'enhance_mat').
- **Integration Test**: Verify the "Max Level" logic by using an EXP potion on a max-level character.
- **Transcendence Test**: Verify that transcendence only works when the character is at Max Level and Max Enhance.

### 📝 Notes for Next Session
1. Run `node migrate.js` in the `app` directory.
2. Initialize game data (Master Data) using the newly added columns.
3. Check `BackendManager.cs` calls in Unity to ensure `characterId` is being passed correctly.
