import { createMiddleware } from 'hono/factory';

/**
 * Ingress middleware: restricts access to HA Supervisor's ingress gateway
 * and extracts ingress headers.
 */
export function ingressGuard() {
  return createMiddleware(async (c, next) => {
    // In production, only allow requests from the Supervisor ingress gateway
    // Skip in development mode
    if (process.env.NODE_ENV !== 'development') {
      const remoteAddr = c.req.header('x-forwarded-for') ?? '';
      if (remoteAddr && !remoteAddr.includes('172.30.32.2')) {
        return c.text('Forbidden', 403);
      }
    }
    await next();
  });
}

/**
 * Extract ingress path from header and attach to context.
 */
export function ingressPath() {
  return createMiddleware(async (c, next) => {
    const basePath = c.req.header('x-ingress-path') ?? '';
    c.set('ingressPath', basePath);
    await next();
  });
}
