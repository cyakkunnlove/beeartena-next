import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, z } from 'zod';
import { verifyAuth } from '@/lib/api/middleware';
import { rateLimit } from '@/lib/api/rateLimiter';
import { cache } from '@/lib/api/cache';
import { logger } from '@/lib/api/logger';

// API Response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Base API Handler Options
export interface ApiHandlerOptions {
  auth?: boolean | 'admin';
  rateLimit?: {
    limit: number;
    window: number;
  };
  cache?: {
    ttl: number;
    key?: (req: NextRequest) => string;
  };
  validation?: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
  };
}

// API Base Handler
export function createApiHandler(
  handlers: {
    GET?: (req: NextRequest, context?: any) => Promise<NextResponse>;
    POST?: (req: NextRequest, context?: any) => Promise<NextResponse>;
    PUT?: (req: NextRequest, context?: any) => Promise<NextResponse>;
    PATCH?: (req: NextRequest, context?: any) => Promise<NextResponse>;
    DELETE?: (req: NextRequest, context?: any) => Promise<NextResponse>;
  },
  options: ApiHandlerOptions = {}
) {
  return async (req: NextRequest, context?: any) => {
    const method = req.method as keyof typeof handlers;
    const handler = handlers[method];

    if (!handler) {
      return apiError('METHOD_NOT_ALLOWED', `Method ${method} is not allowed`, 405);
    }

    try {
      // Rate limiting
      if (options.rateLimit) {
        const limited = await rateLimit.check(req, options.rateLimit);
        if (limited) {
          return apiError('RATE_LIMITED', 'Too many requests', 429);
        }
      }

      // Authentication
      if (options.auth) {
        const authUser = await verifyAuth(req);
        if (!authUser) {
          return apiError('UNAUTHORIZED', 'Authentication required', 401);
        }
        if (options.auth === 'admin' && authUser.role !== 'admin') {
          return apiError('FORBIDDEN', 'Admin access required', 403);
        }
        (req as any).user = authUser;
      }

      // Cache check for GET requests
      if (method === 'GET' && options.cache) {
        const cacheKey = options.cache.key ? options.cache.key(req) : req.url;
        const cached = await cache.get(cacheKey);
        if (cached) {
          return NextResponse.json(cached);
        }
      }

      // Validation
      if (options.validation) {
        const validationErrors: any = {};

        // Body validation
        if (options.validation.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          try {
            const body = await req.json();
            options.validation.body.parse(body);
            (req as any).validatedBody = body;
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.body = error.errors;
            }
          }
        }

        // Query validation
        if (options.validation.query) {
          const { searchParams } = new URL(req.url);
          const query = Object.fromEntries(searchParams.entries());
          try {
            options.validation.query.parse(query);
            (req as any).validatedQuery = query;
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.query = error.errors;
            }
          }
        }

        // Return validation errors if any
        if (Object.keys(validationErrors).length > 0) {
          return apiError('VALIDATION_ERROR', 'Validation failed', 400, validationErrors);
        }
      }

      // Execute handler
      const response = await handler(req, context);

      // Cache response for GET requests
      if (method === 'GET' && options.cache && response.status === 200) {
        const cacheKey = options.cache.key ? options.cache.key(req) : req.url;
        const responseData = await response.json();
        await cache.set(cacheKey, responseData, options.cache.ttl);
        return NextResponse.json(responseData);
      }

      return response;
    } catch (error) {
      logger.error('API Handler Error', { error, method, url: req.url });
      return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  };
}

// Helper functions for responses
export function apiSuccess<T>(data: T, meta?: ApiSuccessResponse['meta']): NextResponse {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...meta,
    },
  };
  return NextResponse.json(response);
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(response, { status });
}

// Pagination helper
export function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 20
): {
  items: T[];
  pagination: NonNullable<ApiSuccessResponse['meta']>['pagination'];
} {
  const total = items.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      hasNext: endIndex < total,
      hasPrev: startIndex > 0,
    },
  };
}