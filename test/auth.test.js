const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../index');

class MemoryUserStore {
    constructor() {
        this.users = new Map();
        this.nextId = 1;
    }

    async createUser(username, passwordHash, options = {}) {
        if (this.users.has(username)) {
            const error = new Error('User already exists');
            error.statusCode = 409;
            throw error;
        }

        const user = {
            id: this.nextId++,
            username,
            password_hash: passwordHash,
            role: options.role || 'user',
            alert_threshold: options.alertThreshold || 100,
            created_at: new Date().toISOString()
        };
        this.users.set(username, user);
        return user;
    }

    async findUser(username) {
        return this.users.get(username) || null;
    }
}

test('register creates a user without leaking the password hash', async () => {
    const app = createApp({ userStore: new MemoryUserStore(), jwtSecret: 'test-secret' });

    const response = await request(app)
        .post('/register')
        .send({ username: 'air_admin', password: 'pollution-safe', alert_threshold: 75 })
        .expect(201);

    assert.equal(response.body.username, 'air_admin');
    assert.equal(response.body.role, 'user');
    assert.equal(response.body.alert_threshold, 75);
    assert.equal(response.body.password_hash, undefined);
});

test('register rejects duplicate users', async () => {
    const store = new MemoryUserStore();
    const app = createApp({ userStore: store, jwtSecret: 'test-secret' });

    await request(app).post('/register').send({ username: 'air_admin', password: 'pollution-safe' }).expect(201);
    await request(app).post('/register').send({ username: 'air_admin', password: 'pollution-safe' }).expect(409);
});

test('login returns a verifiable bearer token for valid credentials', async () => {
    const store = new MemoryUserStore();
    const app = createApp({ userStore: store, jwtSecret: 'test-secret' });
    await store.createUser('air_admin', await bcrypt.hash('pollution-safe', 10), {
        role: 'admin',
        alertThreshold: 42
    });

    const loginResponse = await request(app)
        .post('/login')
        .send({ username: 'air_admin', password: 'pollution-safe' })
        .expect(200);

    assert.match(loginResponse.body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);

    const verifyResponse = await request(app)
        .get('/verify')
        .set('authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

    assert.equal(verifyResponse.body.valid, true);
    assert.equal(verifyResponse.body.user.username, 'air_admin');
    assert.equal(verifyResponse.body.user.role, 'admin');
    assert.equal(verifyResponse.body.user.alert_threshold, 42);
});

test('register rejects invalid alert thresholds', async () => {
    const app = createApp({ userStore: new MemoryUserStore(), jwtSecret: 'test-secret' });

    await request(app)
        .post('/register')
        .send({ username: 'air_admin', password: 'pollution-safe', alert_threshold: -1 })
        .expect(400);
});

test('register does not allow clients to self-assign admin role', async () => {
    const app = createApp({ userStore: new MemoryUserStore(), jwtSecret: 'test-secret' });

    const response = await request(app)
        .post('/register')
        .send({ username: 'air_admin', password: 'pollution-safe', role: 'admin' })
        .expect(201);

    assert.equal(response.body.role, 'user');
});

test('login rejects invalid credentials', async () => {
    const store = new MemoryUserStore();
    const app = createApp({ userStore: store, jwtSecret: 'test-secret' });
    await store.createUser('air_admin', await bcrypt.hash('pollution-safe', 10));

    await request(app)
        .post('/login')
        .send({ username: 'air_admin', password: 'wrong-password' })
        .expect(401);
});
