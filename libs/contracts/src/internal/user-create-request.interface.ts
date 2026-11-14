// What auth asks pg_write to store when a user registers. password is the bcrypt hash.
export interface UserCreateRequest {
  email: string;
  password: string;
  notifyByEmail: boolean;
  // ISO timestamps: dates arrive as strings over TCP.
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
