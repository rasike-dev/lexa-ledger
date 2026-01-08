// errors.ts - API error handling

import { ApiException } from './httpClient';

export class ApiError extends Error {
  // API error types will be defined here
}

export const isApiException = (e: unknown): e is ApiException =>
  e instanceof ApiException;
