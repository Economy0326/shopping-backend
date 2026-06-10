export type UserRole = 'USER' | 'ADMIN';

export type AuthUser = {
  sub: number;
  id?: number;
  email?: string;
  role: UserRole;
};

export type JwtPayload = {
  sub: number;
  email?: string;
  role: UserRole;
  type?: 'access' | 'refresh';
};