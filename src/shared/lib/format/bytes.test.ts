import { describe, expect, it } from 'vitest';

import { splitBytes } from './bytes';

describe('splitBytes', () => {
  it('uses kilobytes below a megabyte', () => {
    expect(splitBytes(92)).toEqual({ value: '0.1', unit: 'kb' });
    expect(splitBytes(1024 * 512)).toEqual({ value: '512.0', unit: 'kb' });
  });

  it('uses megabytes for a typical cloud', () => {
    expect(splitBytes(92 + 500_000 * 16)).toEqual({ value: '7.6', unit: 'mb' });
  });

  it('stays in megabytes for the largest cloud used in performance work', () => {
    expect(splitBytes(92 + 30_000_000 * 16)).toEqual({ value: '457.8', unit: 'mb' });
  });

  it('uses gigabytes past a gibibyte', () => {
    expect(splitBytes(92 + 100_000_000 * 16)).toEqual({ value: '1.49', unit: 'gb' });
  });

  it('switches units exactly at the boundary', () => {
    expect(splitBytes(1024 ** 2 - 1).unit).toBe('kb');
    expect(splitBytes(1024 ** 2).unit).toBe('mb');
    expect(splitBytes(1024 ** 3 - 1).unit).toBe('mb');
    expect(splitBytes(1024 ** 3).unit).toBe('gb');
  });
});
