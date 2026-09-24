const DEFAULT_TIMEOUT_MS = 10000;

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

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

  if (!response.ok) {
    throw new HttpError(`Request failed with status ${response.status}`, response.status);
  }
  return response.json();
};

export const isAbortError = (error) => error?.name === 'AbortError';
