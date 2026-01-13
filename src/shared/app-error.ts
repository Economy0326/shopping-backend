export type AppErrorBody = {
  code: string;
  message: string;
  details?: any;
};

export class AppError extends Error {
  constructor(public readonly body: AppErrorBody, public readonly status: number) {
    super(body.message);
  }
}
