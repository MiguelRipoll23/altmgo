/**
 * Origin of the backend deployment. The site is on Vercel and the API is the
 * mgo2-web-backend container in the k3s cluster, so every call is cross-origin.
 * `VITE_API_BASE_URL` overrides this — that is how a local frontend reaches a
 * backend on another port.
 */
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? 'https://raspberrypi.tailbb45e2.ts.net:10000'
).replace(/\/+$/, '');

export async function isBackendReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => undefined)) as
      | { status?: string }
      | undefined;
    return payload?.status === 'ok';
  } catch {
    return false;
  }
}

/** A refusal the backend named, carrying the status it was answered with. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The line to show for anything a request threw. */
export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

/** Options a request can carry. */
export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
};

/**
 * Calls the backend and returns the body it answered with. A refusal is raised
 * as an {@link ApiError} carrying the message the backend wrote, because those
 * messages are written for the player and are the whole error story the pages
 * have to tell.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Is it running?', 0);
  }

  // A backend that answers with HTML is a wrong origin or a stopped API, not a
  // body this page can use, so it is refused before the JSON parse.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      'The server answered something that is not JSON. Check that the site is pointed at the backend.',
      response.status,
    );
  }

  const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;

  if (!response.ok) {
    throw new ApiError(payload?.error ?? `The server answered ${response.status}.`, response.status);
  }

  return payload as T;
}

/**
 * Calls the backend and returns the body as it arrived, for a response that is not
 * JSON.
 *
 * The companion to {@link apiRequest} for the one thing the API serves as an image
 * rather than as data. A 32x32 PNG is a few hundred bytes, which is nothing to hold
 * in memory and awkward to hand to an `<img>` any other way: the request has to be
 * made by hand here precisely because the browser fetching an image by URL cannot
 * send the session token along with it.
 *
 * A refusal is still answered as JSON by every route, including this one, so the
 * reason is read out of it the same way rather than reported as a bare status.
 */
export async function apiBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
    });
  } catch {
    throw new ApiError('Could not reach the server. Is it running?', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;

    throw new ApiError(payload?.error ?? `The server answered ${response.status}.`, response.status);
  }

  return response.blob();
}
