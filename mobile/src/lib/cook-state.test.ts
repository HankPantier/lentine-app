import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  asCookState,
  clearChecked,
  ingredientKey,
  loadChecked,
  saveChecked,
  toggleKey,
} from './cook-state';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ingredientKey', () => {
  it('encodes section + item index into a stable string', () => {
    expect(ingredientKey(0, 0)).toBe('0:0');
    expect(ingredientKey(2, 5)).toBe('2:5');
  });
});

describe('toggleKey', () => {
  it('adds a key when absent (without mutating input)', () => {
    const before = ['0:0'];
    const after = toggleKey(before, '1:2');
    expect(after).toEqual(['0:0', '1:2']);
    expect(before).toEqual(['0:0']); // no mutation
  });

  it('removes a key when present', () => {
    expect(toggleKey(['0:0', '1:2'], '0:0')).toEqual(['1:2']);
  });
});

describe('asCookState', () => {
  it('returns {} for non-object input', () => {
    expect(asCookState(null)).toEqual({});
    expect(asCookState('nope')).toEqual({});
    expect(asCookState(42)).toEqual({});
    expect(asCookState([])).toEqual({});
  });

  it('keeps slug → string[] entries and drops malformed ones', () => {
    const state = asCookState({
      'good-recipe': ['0:0', '1:1'],
      'bad-array': 'not-an-array',
      'mixed': ['0:0', 7, null, '2:3'],
    });
    expect(state).toEqual({
      'good-recipe': ['0:0', '1:1'],
      'mixed': ['0:0', '2:3'],
    });
    expect(state['bad-array']).toBeUndefined();
  });

  it('round-trips through JSON', () => {
    const original = { a: ['0:0'], b: ['1:2', '3:4'] };
    expect(asCookState(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });
});

describe('storage', () => {
  it('saves then loads checked keys for a slug', async () => {
    await saveChecked('tomato-salad', ['0:1', '2:0']);
    expect(await loadChecked('tomato-salad')).toEqual(['0:1', '2:0']);
  });

  it('returns [] for an unknown slug', async () => {
    expect(await loadChecked('never-cooked')).toEqual([]);
  });

  it('isolates slugs from each other', async () => {
    await saveChecked('recipe-a', ['0:0']);
    await saveChecked('recipe-b', ['1:1']);
    expect(await loadChecked('recipe-a')).toEqual(['0:0']);
    expect(await loadChecked('recipe-b')).toEqual(['1:1']);
  });

  it('clears only the target slug', async () => {
    await saveChecked('recipe-a', ['0:0']);
    await saveChecked('recipe-b', ['1:1']);
    await clearChecked('recipe-a');
    expect(await loadChecked('recipe-a')).toEqual([]);
    expect(await loadChecked('recipe-b')).toEqual(['1:1']);
  });

  it('never writes to the onboarding state key', async () => {
    await saveChecked('recipe-a', ['0:0']);
    expect(await AsyncStorage.getItem('la_onb_state_v1')).toBeNull();
  });
});
