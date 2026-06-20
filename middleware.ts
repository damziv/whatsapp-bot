import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Run on everything EXCEPT:
  //  - /api          (route handlers)
  //  - /_next, /_vercel (framework internals)
  //  - /w            (WhatsApp deep-link redirect handler)
  //  - /auth         (magic-link callback — must stay un-prefixed)
  //  - any path containing a dot (static files like favicon.ico)
  matcher: ['/((?!api|_next|_vercel|w|auth|.*\\..*).*)'],
};
