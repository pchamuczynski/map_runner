/**
 * /api/routes - the signed-in user's routes. Stored data is validated with the same
 * domain schema the browser uses, so the server never stores malformed routes.
 */
import express from 'express';
import { z } from 'zod';
import { sanitizeRoutes } from '../../../src/domain/schema.js';
import { HttpError } from '../middleware/errors.js';

const MAX_ROUTES = 500;

const putBody = z.object({
  version: z.number().int().min(0),
  routes: z.array(z.unknown()).max(MAX_ROUTES, `At most ${MAX_ROUTES} routes`),
});

export const createRouteSetRouter = ({ routeSets }) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(routeSets.get(req.user.id));
  });

  router.put('/', (req, res) => {
    const body = putBody.parse(req.body);
    const result = routeSets.save(req.user.id, sanitizeRoutes(body.routes), body.version);
    if (!result.ok) {
      throw new HttpError(409, 'Your routes were changed on another device or tab.', { version: result.version });
    }
    res.json({ version: result.version });
  });

  return router;
};
