import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type SuccessResponse<T = any> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

export function success<T = any>(
  data: T,
  meta?: SuccessResponse['meta'],
  status = 200
) {
  return json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: any
) {
  return json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

// Common error responses
export const errors = {
  notFound: (resource = 'Resource') =>
    error('not_found', `${resource} not found`, 404),
  unauthorized: () =>
    error('unauthorized', 'Authentication required', 401),
  forbidden: () =>
    error('forbidden', 'Insufficient permissions', 403),
  invalidRequest: (details?: any) =>
    error('invalid_request', 'Invalid request', 400, details),
  internalServerError: () =>
    error('server_error', 'Internal server error', 500),
};

// Auth middleware
export const requireAuth = (locals: App.Locals) => {
  if (!locals.user) {
    throw new Response(JSON.stringify(errors.unauthorized()), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return locals.user;
};

export const requireRole = (locals: App.Locals, roles: string[]) => {
  const user = requireAuth(locals);
  if (!roles.includes(user.role)) {
    throw new Response(JSON.stringify(errors.forbidden()), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
};
