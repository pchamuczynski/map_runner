/**
 * OAuth 1.0a HMAC-SHA1 signatures (RFC 5849). Garmin's Health API still uses this.
 */
import { createHmac, randomBytes } from 'node:crypto';

/** Percent-encode per RFC 3986, which is stricter than encodeURIComponent. */
export const oauthEncode = (value) =>
  encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * @param {{ method: string, url: string, params: Record<string, string | number>, consumerSecret: string, tokenSecret?: string }} input
 *   `url` is the endpoint without a query string. Every query and protocol parameter belongs in `params`.
 */
export const signOauth1 = ({ method, url, params, consumerSecret, tokenSecret = '' }) => {
  const normalised = Object.keys(params)
    .sort()
    .map((key) => `${oauthEncode(key)}=${oauthEncode(params[key])}`)
    .join('&');
  const base = [method.toUpperCase(), oauthEncode(url), oauthEncode(normalised)].join('&');
  const key = `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`;
  return createHmac('sha1', key).update(base).digest('base64');
};

export const authorizationHeader = (oauthParams) =>
  `OAuth ${Object.entries(oauthParams)
    .map(([key, value]) => `${oauthEncode(key)}="${oauthEncode(value)}"`)
    .join(', ')}`;

/** Protocol parameters for one signed request. `extra` is included in the signature but not the header. */
export const oauthParams = ({ consumerKey, token, extra = {} }) => {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    ...(token ? { oauth_token: token } : {}),
  };
  return { oauth, all: { ...oauth, ...extra } };
};
