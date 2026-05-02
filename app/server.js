const express = require('express');
const app = express();
const port = 3000;

const pool = require('./db/index');
const userRoutes = require('./routes/users');
const gachaRoutes = require('./routes/gacha');
const matchRoutes = require('./routes/match');
const inventoryRoutes = require('./routes/inventory');
const equipmentRoutes = require('./routes/equipment');

app.use(express.json());

app.use('/users', userRoutes);
app.use('/gacha', gachaRoutes);
app.use('/match', matchRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/equipment', equipmentRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
