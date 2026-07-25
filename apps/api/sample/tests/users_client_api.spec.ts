import { test, expect } from '../../fixtures/api.fixture';
import { assertStatus, json } from '../../utils/api.utils';
import type { CreateUserRequest } from '../../models/request';
import type { UserResponse } from '../../models/response';

test.describe('Users API via UserApiClient', () => {
  test('listUsers returns a non-empty list', async ({ userClient }) => {
    const res = await userClient.listUsers();

    assertStatus(res, 200);

    const body = await json<UserResponse[]>(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]?.id).toBeTruthy();
  });

  test('getUserById returns user 1 details', async ({ userClient }) => {
    const res = await userClient.getUserById(1);

    assertStatus(res, 200);

    const body = await json<UserResponse>(res);
    expect(body.id).toBe(1);
    expect(body.email).toBeTruthy();
  });

  test('createUser returns generated id with submitted name', async ({ userClient }) => {
    const payload: CreateUserRequest = {
      name: 'Allwright Bot Client',
      username: 'allwright-client',
    };

    const res = await userClient.createUser(payload);

    assertStatus(res, 201);

    const body = await json<{ id: number; name: string }>(res);
    expect(body.id).toBeTruthy();
    expect(body.name).toBe(payload.name);
  });
});
