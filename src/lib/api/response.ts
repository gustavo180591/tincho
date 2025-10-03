import { json } from '@sveltejs/kit';

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
    error('NOT_FOUND', `${resource} not found`, 404),
  unauthorized: (message = 'Authentication required') =>
    error('UNAUTHORIZED', message, 401),
  forbidden: () =>
    error('FORBIDDEN', 'You do not have permission to access this resource', 403),
  badRequest: (message = 'Bad request', details?: any) =>
    error('BAD_REQUEST', message, 400, details),
  invalidRequest: (details?: any) =>
    error('INVALID_REQUEST', 'Invalid request data', 400, details),
  internalServerError: (message = 'An unexpected error occurred') =>
    error('INTERNAL_SERVER_ERROR', message, 500)
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
