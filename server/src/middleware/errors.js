import { ZodError } from 'zod';

/** An error whose message is safe to show to the client. */
export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (_req, _res, next) => next(new HttpError(404, 'Not found'));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by their 4 arguments
export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...error.details });
  }
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request' });
  }
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' });
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });

  // Unexpected: log it, but never leak internals to the client.
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong' });
};
