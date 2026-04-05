import request from 'supertest';
import app from '../app';
import { setupTestDb } from './helpers';

beforeEach(setupTestDb);

// ─── Token helpers ────────────────────────────────────────────────────────────

async function loginAs(role: 'admin' | 'analyst' | 'viewer'): Promise<string> {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: `${role}@test.com`, password: 'password123' });
  return res.body.data.token as string;
}

// ─── GET /records ─────────────────────────────────────────────────────────────

describe('GET /records', () => {
  it('admin can list records', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.meta.total).toBeGreaterThan(0);
  });

  it('analyst can list records', async () => {
    const token = await loginAs('analyst');
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('viewer can list records', async () => {
    const token = await loginAs('viewer');
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('filters by type', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/records?type=income')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.every((r: { type: string }) => r.type === 'income')).toBe(true);
  });

  it('filters by category', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/records?category=Rent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.every((r: { category: string }) => r.category === 'Rent')).toBe(true);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/records');
    expect(res.status).toBe(401);
  });
});

// ─── POST /records ────────────────────────────────────────────────────────────

describe('POST /records', () => {
  const validRecord = {
    amount: 2500,
    type: 'income',
    category: 'Freelance',
    date: '2024-05-01',
    notes: 'Project payment',
  };

  it('admin can create a record', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send(validRecord);
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(2500);
    expect(res.body.data.category).toBe('Freelance');
  });

  it('analyst cannot create a record (403)', async () => {
    const token = await loginAs('analyst');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send(validRecord);
    expect(res.status).toBe(403);
  });

  it('viewer cannot create a record (403)', async () => {
    const token = await loginAs('viewer');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send(validRecord);
    expect(res.status).toBe(403);
  });

  it('rejects a negative amount (422)', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validRecord, amount: -50 });
    expect(res.status).toBe(422);
  });

  it('rejects a bad date format (422)', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validRecord, date: '01-05-2024' });
    expect(res.status).toBe(422);
  });

  it('rejects an invalid type (422)', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validRecord, type: 'transfer' });
    expect(res.status).toBe(422);
  });
});

// ─── PATCH /records/:id ───────────────────────────────────────────────────────

describe('PATCH /records/:id', () => {
  it('admin can update a record', async () => {
    const token = await loginAs('admin');

    // Get the first record
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);
    const recordId = listRes.body.data.data[0].id;

    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Updated note' });
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Updated note');
  });

  it('analyst cannot update a record (403)', async () => {
    const adminToken = await loginAs('admin');
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${adminToken}`);
    const recordId = listRes.body.data.data[0].id;

    const token = await loginAs('analyst');
    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent record', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .patch('/records/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Ghost update' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /records/:id ──────────────────────────────────────────────────────

describe('DELETE /records/:id', () => {
  it('admin can soft-delete a record', async () => {
    const token = await loginAs('admin');
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);
    const recordId = listRes.body.data.data[0].id;

    const delRes = await request(app)
      .delete(`/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    // Should now be gone from the list
    const afterRes = await request(app)
      .get(`/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(afterRes.status).toBe(404);
  });

  it('viewer cannot delete a record (403)', async () => {
    const adminToken = await loginAs('admin');
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${adminToken}`);
    const recordId = listRes.body.data.data[0].id;

    const viewerToken = await loginAs('viewer');
    const res = await request(app)
      .delete(`/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
