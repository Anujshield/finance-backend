import request from 'supertest';
import app from '../app';
import { setupTestDb } from './helpers';

beforeEach(setupTestDb);

async function loginAs(role: 'admin' | 'analyst' | 'viewer'): Promise<string> {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: `${role}@test.com`, password: 'password123' });
  return res.body.data.token as string;
}

describe('GET /users', () => {
  it('admin can list users', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });

  it('viewer cannot list users (403)', async () => {
    const token = await loginAs('viewer');
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('supports pagination', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/users?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(2);
    expect(res.body.data.meta.limit).toBe(2);
  });
});

describe('POST /users', () => {
  it('admin can create a new user', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'newuser@test.com',
        password: 'newpassword1',
        name: 'New User',
        role: 'viewer',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('newuser@test.com');
    // Password should never be exposed
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email (409)', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Duplicate',
        role: 'viewer',
      });
    expect(res.status).toBe(409);
  });

  it('rejects a short password (422)', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'x@test.com', password: 'abc', name: 'X', role: 'viewer' });
    expect(res.status).toBe(422);
  });

  it('analyst cannot create users (403)', async () => {
    const token = await loginAs('analyst');
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'y@test.com', password: 'password123', name: 'Y', role: 'viewer' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /users/:id', () => {
  it('admin can deactivate a user', async () => {
    const token = await loginAs('admin');
    const listRes = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);
    const analyst = listRes.body.data.data.find((u: { role: string }) => u.role === 'analyst');

    const res = await request(app)
      .patch(`/users/${analyst.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('deactivated user cannot log in (401)', async () => {
    const adminToken = await loginAs('admin');
    const listRes = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const viewer = listRes.body.data.data.find((u: { role: string }) => u.role === 'viewer');

    await request(app)
      .patch(`/users/${viewer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'viewer@test.com', password: 'password123' });
    expect(loginRes.status).toBe(401);
  });
});

describe('DELETE /users/:id', () => {
  it('admin can delete another user', async () => {
    const token = await loginAs('admin');
    const listRes = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);
    const viewer = listRes.body.data.data.find((u: { role: string }) => u.role === 'viewer');

    const res = await request(app)
      .delete(`/users/${viewer.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('admin cannot delete their own account (403)', async () => {
    const token = await loginAs('admin');
    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const adminId = meRes.body.data.id;

    const res = await request(app)
      .delete(`/users/${adminId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
