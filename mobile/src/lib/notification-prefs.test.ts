import {
  DEFAULT_NOTIFICATION_PREFS,
  NO_NOTIFICATION_PREFS,
  normalizePrefs,
} from './notification-prefs';

describe('normalizePrefs', () => {
  it('passes through a well-formed object', () => {
    expect(normalizePrefs({ rituals: false, recipes: true, btf: false })).toEqual({
      rituals: false,
      recipes: true,
      btf: false,
    });
  });

  it('fills missing keys from the default (opted-in)', () => {
    expect(normalizePrefs({ recipes: false })).toEqual({ rituals: true, recipes: false, btf: true });
  });

  it('ignores non-boolean values and falls back to default', () => {
    expect(normalizePrefs({ rituals: 'yes', recipes: 1, btf: null })).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('handles null / non-object input', () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normalizePrefs('nope')).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('exposes an all-off constant for "maybe later"', () => {
    expect(NO_NOTIFICATION_PREFS).toEqual({ rituals: false, recipes: false, btf: false });
  });
});
