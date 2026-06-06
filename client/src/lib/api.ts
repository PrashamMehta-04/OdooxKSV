export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export interface ApiErrorBody {
  message?: string;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as TResponse;
}
