import type { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { CreateUserRequest } from '../models/request';

export class UserApiClient extends BaseApiClient {
  listUsers(): Promise<APIResponse> {
    return this.get('/users');
  }

  getUserById(id: number): Promise<APIResponse> {
    return this.get(`/users/${id}`);
  }

  createUser(payload: CreateUserRequest): Promise<APIResponse> {
    return this.post('/users', payload);
  }
}
