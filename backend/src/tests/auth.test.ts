/**
 * Auth & Password Tests
 *
 * Tests the validatePasswordStrength function which enforces the same rules
 * at signup, change-password, and password reset. These rules are a core
 * security gate — if they break, weak passwords enter the system.
 */
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../services/userAuth.service';

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    const result = validatePasswordStrength('Secure#Pass1');
    expect(result.valid).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/8 characters/);
  });

  it('rejects passwords with no uppercase letter', () => {
    const result = validatePasswordStrength('secure#pass1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/uppercase/i);
  });

  it('rejects passwords with no number', () => {
    const result = validatePasswordStrength('Secure#Pass!');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/number/i);
  });

  it('rejects passwords with no special character', () => {
    const result = validatePasswordStrength('SecurePass1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/special character/i);
  });

  it('rejects passwords exceeding 128 characters', () => {
    const result = validatePasswordStrength('A1!' + 'a'.repeat(130));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/128/);
  });
});
