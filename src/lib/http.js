const DEFAULT_TIMEOUT_MS = 10000;

export class HttpError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

/** Uses the server's `{ error }` message when it sent one (rendered as text, never HTML). */
const errorFromResponse = async (response) => {
  const body = await response.json().catch(() => null);
  const message = typeof body?.error === 'string' ? body.error : `Request failed with status ${response.status}`;
  return new HttpError(message, response.status, body);
};

/**
 * fetch() wrapper that enforces a timeout, honours a caller's AbortSignal,
 * rejects on non-2xx responses and parses JSON.
 */
export const fetchJson = async (url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = {}) => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response;
  try {
    response = await fetch(url, { ...init, signal: combinedSignal });
  } catch (error) {
    if (timeoutSignal.aborted && !signal?.aborted) {
      throw new HttpError('Request timed out', 0);
    }
    throw error;
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return null;
  return response.json();
};

export const isAbortError = (error) => error?.name === 'AbortError';
