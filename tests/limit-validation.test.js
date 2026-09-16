import {
  validateLimitValue,
  validateDomain,
  validateLimitConfig,
  buildValidatedLimitConfig,
  LIMIT_MIN,
  LIMIT_MAX,
} from '../src/common/limit-validation.js';

describe('limit-validation', () => {
  describe('validateLimitValue', () => {
    test('accepts valid positive integers', () => {
      expect(validateLimitValue(1)).toEqual({ valid: true, value: 1 });
      expect(validateLimitValue('10')).toEqual({ valid: true, value: 10 });
      expect(validateLimitValue(LIMIT_MAX)).toEqual({ valid: true, value: LIMIT_MAX });
    });

    test('rejects empty, null, undefined', () => {
      expect(validateLimitValue('').valid).toBe(false);
      expect(validateLimitValue(null).valid).toBe(false);
      expect(validateLimitValue(undefined).valid).toBe(false);
    });

    test('rejects zero and negatives', () => {
      expect(validateLimitValue(0).valid).toBe(false);
      expect(validateLimitValue(-1).valid).toBe(false);
      expect(validateLimitValue('-5').valid).toBe(false);
    });

    test('rejects non-integers and exceeds max', () => {
      expect(validateLimitValue('3.5').valid).toBe(false);
      expect(validateLimitValue(1.5).valid).toBe(false);
      expect(validateLimitValue(LIMIT_MAX + 1).valid).toBe(false);
    });

    test('rejects non-numeric strings', () => {
      expect(validateLimitValue('abc').valid).toBe(false);
    });
  });

  describe('validateDomain', () => {
    test('accepts valid domains', () => {
      expect(validateDomain('example.com').valid).toBe(true);
      expect(validateDomain('sub.example.co.uk').valid).toBe(true);
    });

    test('normalizes https prefix and path', () => {
      const r = validateDomain('https://example.com/path');
      expect(r.valid).toBe(true);
      expect(r.normalized).toBe('example.com');
    });

    test('normalizes http prefix and lowercases', () => {
      const r = validateDomain('HTTP://Example.COM');
      expect(r.valid).toBe(true);
      expect(r.normalized).toBe('example.com');
    });

    test('uses the same www normalization as visit tracking', () => {
      expect(validateDomain('https://www.X.com/home')).toEqual({
        valid: true,
        normalized: 'x.com',
      });
    });

    test('rejects invalid domains', () => {
      expect(validateDomain('').valid).toBe(false);
      expect(validateDomain('localhost').valid).toBe(false);
      expect(validateDomain('no-dot').valid).toBe(false);
      expect(validateDomain('example com').valid).toBe(false);
    });
  });

  describe('validateLimitConfig', () => {
    test('passes when both disabled', () => {
      expect(
        validateLimitConfig({
          fiveHourEnabled: false,
          fiveHourLimit: '',
          dailyEnabled: false,
          dailyLimit: '',
        }).valid,
      ).toBe(true);
    });

    test('validates enabled fiveHour limit', () => {
      expect(
        validateLimitConfig({
          fiveHourEnabled: true,
          fiveHourLimit: '5',
          dailyEnabled: false,
          dailyLimit: '',
        }).valid,
      ).toBe(true);
      expect(
        validateLimitConfig({
          fiveHourEnabled: true,
          fiveHourLimit: '0',
          dailyEnabled: false,
          dailyLimit: '',
        }).valid,
      ).toBe(false);
    });

    test('validates enabled daily limit', () => {
      expect(
        validateLimitConfig({
          fiveHourEnabled: false,
          fiveHourLimit: '',
          dailyEnabled: true,
          dailyLimit: '10',
        }).valid,
      ).toBe(true);
      expect(
        validateLimitConfig({
          fiveHourEnabled: false,
          fiveHourLimit: '',
          dailyEnabled: true,
          dailyLimit: '-2',
        }).valid,
      ).toBe(false);
    });

    test('validates both when enabled', () => {
      expect(
        validateLimitConfig({
          fiveHourEnabled: true,
          fiveHourLimit: '5',
          dailyEnabled: true,
          dailyLimit: '20',
        }).valid,
      ).toBe(true);
    });
  });

  describe('buildValidatedLimitConfig', () => {
    test('builds normalized config for valid input', () => {
      const res = buildValidatedLimitConfig({
        domain: 'example.com',
        enabled: true,
        fiveHourEnabled: true,
        fiveHourLimit: '5',
        dailyEnabled: true,
        dailyLimit: '20',
      });
      expect(res.valid).toBe(true);
      expect(res.domain).toBe('example.com');
      expect(res.config.enabled).toBe(true);
      expect(res.config.fiveHour.limit).toBe(5);
      expect(res.config.daily.limit).toBe(20);
    });

    test('uses defaults when limit disabled', () => {
      const res = buildValidatedLimitConfig({
        domain: 'example.com',
        enabled: true,
        fiveHourEnabled: false,
        fiveHourLimit: '',
        dailyEnabled: false,
        dailyLimit: '',
      });
      expect(res.valid).toBe(true);
      expect(res.config.fiveHour.limit).toBe(10);
      expect(res.config.daily.limit).toBe(20);
    });

    test('rejects invalid domain', () => {
      const res = buildValidatedLimitConfig({
        domain: 'notadomain',
        enabled: true,
        fiveHourEnabled: false,
        fiveHourLimit: '',
        dailyEnabled: false,
        dailyLimit: '',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    test('rejects invalid limit when enabled', () => {
      const res = buildValidatedLimitConfig({
        domain: 'example.com',
        enabled: true,
        fiveHourEnabled: true,
        fiveHourLimit: '0',
        dailyEnabled: false,
        dailyLimit: '',
      });
      expect(res.valid).toBe(false);
    });

    test('enforces LIMIT_MIN and LIMIT_MAX', () => {
      expect(LIMIT_MIN).toBe(1);
      expect(LIMIT_MAX).toBe(1000);
    });
  });
});
