/**
 * Connected apps. OAuth starts and finishes in the browser; tokens stay here.
 * Garmin pushes new activities to /api/integrations/garmin/push (no session cookie).
 */
import { Router } from 'express';
import { GarminError } from '../integrations/garmin.js';
import { HttpError } from '../middleware/errors.js';
import { requireUser } from '../middleware/session.js';
import { createIntegrationRepository } from '../repositories/integrations.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

const one = (value) => (Array.isArray(value) ? value[0] : value) ?? '';

const home = (config, query) => {
  const params = new URLSearchParams(query);
  const suffix = params.size > 0 ? `?${params}` : '';
  return `${config.appOrigins[0]}/${suffix}`;
};

const summariesOf = (body) => {
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.activities) ? body.activities : [];
};

export const createGarminPushHandler = ({ db, garmin }) => {
  const repo = createIntegrationRepository(db);

  return async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const deregistrations = Array.isArray(body.deregistrations) ? body.deregistrations : [];
      for (const item of deregistrations) {
        const row = item?.userAccessToken ? repo.findByToken('garmin', item.userAccessToken) : null;
        if (row) repo.remove(row.user_id, 'garmin');
      }

      const items = summariesOf(body);
      const direct = new Map();
      for (const item of items) {
        if (item?.callbackURL && !item.activityType && item.activityId == null && item.summaryId == null) continue;
        const row = item?.userAccessToken ? repo.findByToken('garmin', item.userAccessToken) : null;
        if (!row) continue;
        const list = direct.get(row.user_id) ?? [];
        list.push(item);
        direct.set(row.user_id, list);
      }
      for (const [userId, summaries] of direct) repo.saveActivities(userId, summaries);

      for (const item of items) {
        if (!item?.callbackURL) continue;
        const row = item.userAccessToken ? repo.findByToken('garmin', item.userAccessToken) : null;
        if (!row) continue;
        const summaries = await garmin.pullUrl(row, item.callbackURL);
        repo.saveActivities(row.user_id, summaries);
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
};

export const createIntegrationRouter = ({ config, db, garmin }) => {
  const repo = createIntegrationRepository(db);
  const router = Router();

  const fail = (error) => {
    if (error instanceof HttpError) throw error;
    if (error instanceof GarminError && error.status === 401) throw new HttpError(401, 'Reconnect Garmin');
    if (error instanceof GarminError) throw new HttpError(502, 'Garmin could not be reached');
    throw error;
  };

  router.get('/', requireUser, (req, res) => {
    res.json({ connected: repo.list(req.user.id) });
  });

  router.get('/garmin/connect', requireUser, async (req, res) => {
    if (!garmin.configured) {
      return res.redirect(home(config, { garmin: 'error', reason: 'Add Garmin API credentials on the server, then try again' }));
    }
    if (garmin.personal) {
      repo.save(req.user.id, 'garmin', 'personal', '');
      return res.redirect(home(config, { garmin: 'connected' }));
    }
    try {
      const pending = await garmin.beginConnect(`${config.appOrigins[0]}/api/integrations/garmin/callback`);
      repo.saveRequest(pending.requestToken, req.user.id, 'garmin', pending.requestSecret);
      res.redirect(pending.authorizeUrl);
    } catch {
      res.redirect(home(config, { garmin: 'error', reason: 'Garmin could not start the connection' }));
    }
  });

  router.get('/garmin/callback', async (req, res) => {
    const token = one(req.query.oauth_token);
    const verifier = one(req.query.oauth_verifier);
    const pending = token ? repo.takeRequest(token) : null;
    if (!pending || pending.provider !== 'garmin' || !verifier) {
      return res.redirect(home(config, { garmin: 'error', reason: 'Garmin connection was cancelled' }));
    }
    try {
      const access = await garmin.finishConnect({ requestToken: token, requestSecret: pending.token_secret, verifier });
      repo.save(pending.user_id, 'garmin', access.token, access.secret);
      res.redirect(home(config, { garmin: 'connected' }));
    } catch {
      res.redirect(home(config, { garmin: 'error', reason: 'Garmin could not finish the connection' }));
    }
  });

  router.delete('/garmin', requireUser, async (req, res, next) => {
    try {
      const row = repo.get(req.user.id, 'garmin');
      if (row && garmin.configured && !garmin.personal && garmin.deregister) {
        try {
          await garmin.deregister(row);
        } catch (error) {
          if (error?.status !== 401 && error?.status !== 404) fail(error);
        }
      }
      if (row) repo.remove(req.user.id, 'garmin');
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/garmin/activities', requireUser, async (req, res, next) => {
    try {
      if (!garmin.configured) throw new HttpError(503, 'Garmin is not configured on the server');
      let row = repo.get(req.user.id, 'garmin');
      if (!row && garmin.personal) {
        repo.save(req.user.id, 'garmin', 'personal', '');
        row = repo.get(req.user.id, 'garmin');
      }
      if (!row) throw new HttpError(404, 'Garmin is not connected');

      const from = one(req.query.from);
      const to = one(req.query.to);
      const since = one(req.query.since);
      if ((from || to) && (!DATE.test(from) || !DATE.test(to) || from > to)) throw new HttpError(400, 'Enter a valid date range');
      if (from && (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > MAX_RANGE_DAYS) {
        throw new HttpError(400, 'Choose a period of at most a year');
      }
      if (since && !Number.isFinite(Date.parse(since))) throw new HttpError(400, 'Invalid since');

      let fresh = [];
      try {
        fresh = await garmin.fetchActivities(row, { from: from || undefined, to: to || undefined, since: since || undefined });
      } catch (error) {
        if (error?.status === 401) {
          if (!garmin.personal) repo.remove(req.user.id, 'garmin');
          throw new HttpError(401, garmin.personal ? 'Garmin rejected the personal key' : 'Reconnect Garmin');
        }
        if (!(from && to) || garmin.personal) fail(error);
      }
      repo.saveActivities(req.user.id, fresh);
      const stored = from && to ? repo.activitiesBetween(req.user.id, from, to) : repo.activitiesSince(req.user.id, since || '1970-01-01T00:00:00.000Z');
      res.json(stored);
    } catch (error) {
      next(error instanceof GarminError ? new HttpError(502, 'Garmin could not be reached') : error);
    }
  });

  return router;
};
