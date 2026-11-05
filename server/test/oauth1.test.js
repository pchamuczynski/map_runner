import { describe, expect, it } from 'vitest';
import { signOauth1 } from '../src/integrations/oauth1.js';

describe('OAuth 1.0a signatures', () => {
  it('matches the HMAC-SHA1 example in RFC 5849', () => {
    const signature = signOauth1({
      method: 'POST',
      url: 'https://photos.example.net/initiate',
      consumerSecret: 'kd94hf93k423kf44',
      tokenSecret: 'pfkkdhi9sl3r4s00',
      params: {
        oauth_consumer_key: 'dpf43f3p2l4k3l03',
        oauth_token: 'nnch734d00sl2jdk',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: '137131202',
        oauth_nonce: 'chapoH',
        oauth_version: '1.0',
        file: 'vacation.jpg',
        size: 'original',
      },
    });
    // HMAC-SHA1 of the photos.example.net base string from RFC 5849.
    expect(signature).toBe('g40JIXS4t3uq0Z9PimaXzZVgDLE=');
  });
});
