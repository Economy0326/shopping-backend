export type CurrentUser = {
  sub: number;
  email: string;
  role: "user" | "admin";
};