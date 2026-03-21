/**
 * Declarative controller handler.
 *
 * Wraps a service call in the standard Express request/response cycle,
 * eliminating try/catch boilerplate from every controller function.
 * Errors bubble up to the global error middleware in app.ts.
 *
 * Usage:
 *   router.get("/gigs",        handle(()              => gigsService.getGigs()));
 *   router.get("/gigs/:id",    handle(req             => gigsService.getGigById(+req.params.id)));
 *   router.post("/gigs",       handle(req             => gigsService.createGig(req.body), 201));
 *   router.delete("/gigs/:id", handle(req             => gigsService.deleteGig(+req.params.id), 204));
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";

export function handle<T>(
  fn: (req: Request, res: Response) => Promise<T> | T,
  status = 200,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req, res);
      if (res.headersSent) return;
      if (result === undefined || result === null) {
        res.status(status).send();
      } else {
        res.status(status).json(result);
      }
    } catch (err) {
      next(err);
    }
  };
}
