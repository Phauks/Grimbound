/**
 * Cloudflare Worker entry point
 *
 * Serves static assets with security headers and caching configuration.
 */

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Serve the asset
    const response = await env.ASSETS.fetch(request);

    // Clone response to modify headers
    const newResponse = new Response(response.body, response);

    // Security headers
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content Security Policy - configured for app requirements
    const csp = [
      "default-src 'self'",
      // Scripts: self + inline/eval for Vite/React bundled code
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles: self + inline + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self + Google Fonts + data URIs
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: self + data/blob URIs + external images (user content)
      "img-src 'self' data: blob: https:",
      // API connections: GitHub API, Google Fonts, Cloudflare
      "connect-src 'self' https://api.github.com https://fonts.googleapis.com https://*.cloudflare.com",
      // Service worker
      "worker-src 'self' blob:",
      // Prevent embedding in iframes
      "frame-ancestors 'none'",
    ].join('; ');
    newResponse.headers.set('Content-Security-Policy', csp);

    // Cache headers for immutable hashed assets (long-term cache)
    const url = new URL(request.url);
    if (url.pathname.match(/\.[a-f0-9]{8}\.(js|css|woff2?)$/)) {
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return newResponse;
  },
};
