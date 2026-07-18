// Request contract interfaces — one per API operation.
// Name them <Domain>Request to match the response counterpart.
//
// Example:
//
//   export interface UserRequest {
//     name: string;
//     email: string;
//     job?: string;
//   }
//
//   export interface LoginRequest {
//     email: string;
//     password: string;
//   }
//
// Interfaces are plain data shapes — no class instances, no Jackson-style
// deserialisation. Playwright serialises these to JSON automatically when
// passed to request.post({ data: payload }).

export {};
