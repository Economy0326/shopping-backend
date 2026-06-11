import type { Request } from 'express';

export type CurrentUser = {
  sub: number;
  email: string;
  role: 'user' | 'admin';
};

export type RequestWithUser = Request & {
  user?: CurrentUser;
};

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue | QueryValue[]>;
