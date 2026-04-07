const express = require('express');
const app = express();
const port = 3000;

const pool = require('./db/index');
const userRoutes = require('./routes/users');
const gachaRoutes = require('./routes/gacha');
const matchRoutes = require('./routes/match');

app.use(express.json());

app.use('/users', userRoutes);
app.use('/gacha', gachaRoutes);
app.use('/match', matchRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

