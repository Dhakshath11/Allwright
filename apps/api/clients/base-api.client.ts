import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Base class for all API client classes in this surface.
 *
 * Service-specific clients extend this and expose domain methods:
 *
 *   export class UserApiClient extends BaseApiClient {
 *     async list(page?: number) {
 *       return this.get('/api/users', page ? { page: String(page) } : undefined);
 *     }
 *     async create(user: UserRequest) {
 *       return this.post('/api/users', user);
 *     }
 *   }
 *
 * Tests never call request.get/post directly — they always go through a client:
 *   test('...', async ({ userClient }) => {
 *     const res = await userClient.list();
 *     assertStatus(res, 200);
 *   });
 */
export class BaseApiClient {
  constructor(protected readonly request: APIRequestContext) {}

  protected get(
    path: string,
    params?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.get(path, { params });
  }

  protected post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(path, { data });
  }

  protected put(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.put(path, { data });
  }

  protected patch(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.patch(path, { data });
  }

  protected delete(path: string): Promise<APIResponse> {
    return this.request.delete(path);
  }
}
