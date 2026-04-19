import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { of, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoaderService } from '../../../services/loader-services/loader.service';

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const platformId = inject(PLATFORM_ID);

  const excludedRoutes: string[] = [];
  // Handle SSR: Skip `location` usage when running on the server
  if (!isPlatformBrowser(platformId)) {
    console.log(`Skipping loader for SSR: ${req.url}`);
    return next(req);
  }

  // Check if the current request URL is in the excluded routes
  if (isExcludedRoute(req.url, excludedRoutes)) {
    console.log(`Request to ${req.url} is excluded from loader.`);
    loaderService.setLoadingState(false);
    return next(req);
  }

  // Delay loader activation by 5 seconds (5000ms)
  const loaderDelay = 5000;
  let loaderActivated = false;
  const loaderTimeout = setTimeout(() => {
    loaderService.setLoadingState(true);
    loaderActivated = true;
  }, loaderDelay);

  return next(req).pipe(
    finalize(() => {
      clearTimeout(loaderTimeout);
      if (loaderActivated) {     
        loaderService.setLoadingState(false);
      }
    }),
    catchError(error => {
      clearTimeout(loaderTimeout);
      if (loaderActivated) {
        loaderService.setLoadingState(false);
      }
      return throwError(() => error);
    })
  );
};


function isExcludedRoute(url: string, excludedRoutes: string[]): boolean {
  try {
    const urlPathname = new URL(url, 'http://localhost').pathname; // Default to 'http://localhost' for SSR-safe URL parsing
    return excludedRoutes.some(route => urlPathname === route);
  } catch (error) {
    console.error(`Failed to parse URL: ${url}`, error);
    return false;
  }
}
