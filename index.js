const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const DEFAULT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_IO_SERVICE_URL = process.env.IO_SERVICE_URL || 'http://io-service:7000';
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

class HttpUserStore {
    constructor(baseUrl = DEFAULT_IO_SERVICE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async createUser(username, passwordHash, options = {}) {
        const response = await fetch(`${this.baseUrl}/users`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                username,
                password_hash: passwordHash,
                alert_threshold: options.alertThreshold,
                role: options.role
            })
        });

        if (response.status === 409) {
            const error = new Error('User already exists');
            error.statusCode = 409;
            throw error;
        }

        if (!response.ok) {
            const error = new Error(`IO service rejected user creation with status ${response.status}`);
            error.statusCode = 502;
            throw error;
        }

        return response.json();
    }

    async findUser(username) {
        const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const error = new Error(`IO service rejected user lookup with status ${response.status}`);
            error.statusCode = 502;
            throw error;
        }

        return response.json();
    }
}

function isValidUsername(username) {
    return typeof username === 'string' && /^[a-zA-Z0-9_.-]{3,64}$/.test(username);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

function normalizeAlertThreshold(value) {
    if (value === undefined || value === null || value === '') {
        return 100;
    }

    const threshold = Number(value);
    if (!Number.isFinite(threshold) || threshold <= 0) {
        return null;
    }

    return threshold;
}

function getCredentials(req) {
    return {
        username: req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '',
        password: req.body ? req.body.password : undefined,
        alertThreshold: req.body ? normalizeAlertThreshold(req.body.alert_threshold) : 100
    };
}

function createApp(options = {}) {
    const app = express();
    const userStore = options.userStore || new HttpUserStore(options.ioServiceUrl);
    const jwtSecret = options.jwtSecret || DEFAULT_JWT_SECRET;

    app.use(express.json());

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'auth-service' });
    });

    app.get('/metrics', (req, res) => {
        res.type('text/plain').send('airpure_auth_service_up 1\n');
    });

    app.post('/register', async (req, res, next) => {
        try {
            const { username, password, alertThreshold } = getCredentials(req);

            if (!isValidUsername(username) || !isValidPassword(password) || alertThreshold === null) {
                return res.status(400).json({
                    error: 'username must be 3-64 safe characters, password must be at least 8 characters, and alert_threshold must be positive'
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await userStore.createUser(username, passwordHash, {
                alertThreshold,
                role: 'user'
            });

            return res.status(201).json({
                id: user.id,
                username: user.username,
                role: user.role,
                alert_threshold: user.alert_threshold,
                created_at: user.created_at
            });
        } catch (error) {
            return next(error);
        }
    });

    app.post('/login', async (req, res, next) => {
        try {
            const { username, password } = getCredentials(req);

            if (!isValidUsername(username) || typeof password !== 'string') {
                return res.status(400).json({ error: 'username and password are required' });
            }

            const user = await userStore.findUser(username);
            const passwordMatches = user && await bcrypt.compare(password, user.password_hash || '');

            if (!passwordMatches) {
                return res.status(401).json({ error: 'invalid credentials' });
            }

            const token = jwt.sign(
                {
                    sub: String(user.id),
                    username: user.username,
                    role: user.role || 'user',
                    alert_threshold: Number(user.alert_threshold || 100)
                },
                jwtSecret,
                { expiresIn: '1h' }
            );

            return res.json({ token, token_type: 'Bearer' });
        } catch (error) {
            return next(error);
        }
    });

    app.get('/verify', (req, res) => {
        const header = req.header('authorization') || '';
        const [scheme, token] = header.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ error: 'missing bearer token' });
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            return res.json({
                valid: true,
                user: {
                    id: payload.sub,
                    username: payload.username,
                    role: payload.role || 'user',
                    alert_threshold: Number(payload.alert_threshold || 100)
                }
            });
        } catch (error) {
            return res.status(401).json({ valid: false, error: 'invalid token' });
        }
    });

    app.use((error, req, res, next) => {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'internal server error' });
    });

    return app;
}

if (require.main === module) {
    createApp().listen(DEFAULT_PORT, () => {
        console.log(`Auth Service running on port ${DEFAULT_PORT}`);
    });
}

module.exports = { createApp, HttpUserStore };
