import request from 'supertest';
import app from '../app';
import { setupTestDb } from './helpers';

beforeEach(setupTestDb);

describe('POST /auth/login', () => {
  it('returns 200 and a token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 422 for missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@test.com' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toBeDefined();
  });

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(422);
  });
});

describe('GET /auth/me', () => {
  async function getToken(email = 'admin@test.com') {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'password123' });
    return res.body.data.token as string;
  }

  it('returns the authenticated user', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@test.com');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a tampered token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});
