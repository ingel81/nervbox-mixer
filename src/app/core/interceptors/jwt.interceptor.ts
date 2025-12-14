import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'nervbox_token';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  // Only add token to API requests (not auth endpoints)
  if (token && req.url.includes('/api') && !req.url.includes('/auth/')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
