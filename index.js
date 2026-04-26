const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

app.post('/login', (req, res) => {
    // Logica simplificată pentru Etapa 2
    const token = jwt.sign({ user: 'admin' }, 'secret_key');
    res.json({ token });
});

app.listen(3000, () => console.log('Auth Service running on port 3000'));