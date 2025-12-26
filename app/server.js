const express = require('express');
const app = express();
const port = 3000;

const userRoutes = require('./routes/users');
const characterRoutes = require('./routes/characters');
const gachaRoutes = require('./routes/gacha');

app.use(express.json());

app.use('/users', userRoutes);
app.use('/characters', characterRoutes);
app.use('/gacha', gachaRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

