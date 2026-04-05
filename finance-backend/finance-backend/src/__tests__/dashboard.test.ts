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

describe('GET /dashboard/summary', () => {
  it('admin receives a valid summary', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(typeof data.totalIncome).toBe('number');
    expect(typeof data.totalExpenses).toBe('number');
    expect(typeof data.netBalance).toBe('number');
    expect(Array.isArray(data.categoryTotals)).toBe(true);
    expect(Array.isArray(data.monthlyTrends)).toBe(true);
    expect(Array.isArray(data.recentRecords)).toBe(true);
  });

  it('analyst receives a valid summary', async () => {
    const token = await loginAs('analyst');
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('viewer receives a valid summary', async () => {
    const token = await loginAs('viewer');
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('netBalance equals totalIncome minus totalExpenses', async () => {
    const token = await loginAs('admin');
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    const { totalIncome, totalExpenses, netBalance } = res.body.data;
    expect(netBalance).toBeCloseTo(totalIncome - totalExpenses, 5);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/dashboard/summary');
    expect(res.status).toBe(401);
  });
});
