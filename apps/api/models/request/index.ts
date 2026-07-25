// Request contract interfaces — one per API operation.
// Name them <Domain>Request to match the response counterpart.
//
// Interfaces are plain data shapes — no class instances, no Jackson-style
// deserialisation. Playwright serialises these to JSON automatically when
// passed to request.post({ data: payload }).

export interface CreateUserRequest {
  name: string;
  username: string;
  email?: string;
}
