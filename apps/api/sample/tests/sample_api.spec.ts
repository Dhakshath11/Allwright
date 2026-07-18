import { test, expect } from '../../fixtures/api.fixture';
import { assertStatus, json } from '../../utils/api.utils';
import type { UserResponse } from '../../models/response';

// Sample suite targeting jsonplaceholder.typicode.com — replace with your target API.
// Override the base URL via the API_BASE_URL environment variable.
//
// These three tests cover the foundational GET/POST patterns.
// Extend this file (or add <service>_api.spec.ts siblings) as APIs are onboarded.

test.describe('Users API', () => {
  test('GET /users — returns user list', async ({ request }) => {
    const res = await request.get('/users');

    assertStatus(res, 200);

    const body = await json<unknown[]>(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /users/1 — returns a single user', async ({ request }) => {
    const res = await request.get('/users/1');

    assertStatus(res, 200);

    const body = await json<{ id: number; email: string }>(res);
    expect(body.id).toBe(1);
    expect(body.email).toBeTruthy();
  });

  test('GET /users/1 — company details are correct', async ({ request }) => {
    const res = await request.get('/users/1');

    assertStatus(res, 200);

    const body = await json<UserResponse>(res);

    expect(body.id).toBe(1);
    expect(body.company).toMatchObject({
      name: 'Romaguera-Crona',
      catchPhrase: expect.any(String),
      bs: expect.any(String),
    });
  });

  test('POST /users — creates user and returns generated id', async ({ request }) => {
    const res = await request.post('/users', {
      data: {
        name: 'Allwright Bot',
        username: 'allwright'
      },
    });

    assertStatus(res, 201);

    const body = await json<{ id: number; name: string }>(res);
    expect(body.name).toBe('Allwright Bot');
    expect(body.id).toBeTruthy();
  });
});
