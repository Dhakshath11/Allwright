// Important: TypeScript types are erased at runtime. response.json() returns
// `unknown`; the cast `as UserResponse` is a compile-time convenience only.
// Add JSON Schema validation via apps/api/schemas/ when the shape must be
// verified at runtime (e.g. contract tests).

export interface GeoResponse {
  lat: string;
  lng: string;
}

export interface AddressResponse {
  street: string;
  suite?: string;
  city: string;
  zipcode: string;
  geo: GeoResponse;
}

export interface CompanyResponse {
  name: string;
  catchPhrase: string;
  bs: string;
}

export interface UserResponse {
  id: number;
  name: string;
  username: string;
  email: string;
  address: AddressResponse;
  phone: string;
  website: string;
  company: CompanyResponse;
}
