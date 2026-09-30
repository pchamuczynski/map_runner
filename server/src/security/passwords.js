/**
 * Password hashing with Argon2id (OWASP parameters: 19 MiB memory, 2 iterations, parallelism 1).
 */
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = Object.freeze({ memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const hashPassword = (password) => hash(password, OPTIONS);

let dummyHash = null;

/**
 * Verifies a password. When the account does not exist (or has no password), a dummy
 * hash is still verified so response timing does not reveal whether an email is registered.
 */
export const verifyPassword = async (storedHash, password) => {
  if (!storedHash) {
    dummyHash ??= await hashPassword('dummy-password-for-timing');
    await verify(dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
};
