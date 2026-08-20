import { describe, expect, it } from 'vitest';

import { BINARY_EXTENSION, isBinaryCloudFile, sourceKey, sourceName } from './source';

function file(name: string, size = 16, lastModified = 1000): File {
  return new File([new Uint8Array(size)], name, { lastModified });
}

describe('sourceKey', () => {
  it('separates two urls', () => {
    const a = sourceKey({ kind: 'url', url: '/clouds/a.pcb', name: 'a' });
    const b = sourceKey({ kind: 'url', url: '/clouds/b.pcb', name: 'b' });
    expect(a).not.toBe(b);
  });

  it('ignores the display name, only the url identifies a request', () => {
    const a = sourceKey({ kind: 'url', url: '/clouds/a.pcb', name: 'first' });
    const b = sourceKey({ kind: 'url', url: '/clouds/a.pcb', name: 'second' });
    expect(a).toBe(b);
  });

  it('matches the same file picked twice, despite a new File object', () => {
    const a = sourceKey({ kind: 'file', file: file('cloud.pcb') });
    const b = sourceKey({ kind: 'file', file: file('cloud.pcb') });
    expect(a).toBe(b);
  });

  it('separates files that differ in size or modification time', () => {
    const base = sourceKey({ kind: 'file', file: file('cloud.pcb', 16, 1000) });
    expect(sourceKey({ kind: 'file', file: file('cloud.pcb', 32, 1000) })).not.toBe(base);
    expect(sourceKey({ kind: 'file', file: file('cloud.pcb', 16, 2000) })).not.toBe(base);
  });

  it('never confuses a file with a url', () => {
    const asFile = sourceKey({ kind: 'file', file: file('cloud.pcb') });
    const asUrl = sourceKey({ kind: 'url', url: 'cloud.pcb', name: 'cloud.pcb' });
    expect(asFile).not.toBe(asUrl);
  });
});

describe('sourceName', () => {
  it('uses the dataset name for a url and the file name for a file', () => {
    expect(sourceName({ kind: 'url', url: '/clouds/dev.pcb', name: 'dev.pcb' })).toBe('dev.pcb');
    expect(sourceName({ kind: 'file', file: file('scan.pcb') })).toBe('scan.pcb');
  });
});

describe('isBinaryCloudFile', () => {
  it('accepts the project extension in any case', () => {
    expect(isBinaryCloudFile(file(`cloud${BINARY_EXTENSION}`))).toBe(true);
    expect(isBinaryCloudFile(file('CLOUD.PCB'))).toBe(true);
  });

  it('rejects anything else, including formats not wired up yet', () => {
    expect(isBinaryCloudFile(file('cloud.ply'))).toBe(false);
    expect(isBinaryCloudFile(file('cloud.laz'))).toBe(false);
    expect(isBinaryCloudFile(file('pcb'))).toBe(false);
    expect(isBinaryCloudFile(file('cloud.pcb.txt'))).toBe(false);
  });
});
