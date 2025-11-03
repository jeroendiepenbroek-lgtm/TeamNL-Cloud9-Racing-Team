export class ZwiftApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
  ) {
    super(message);
    this.name = 'ZwiftApiError';
  }
}

export class RateLimitError extends ZwiftApiError {
  constructor(endpoint: string) {
    super(`Rate limit bereikt voor endpoint: ${endpoint}`, 429, endpoint);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
