export type CloudSource = { kind: 'url'; url: string; name: string } | { kind: 'file'; file: File };

export const BINARY_EXTENSION = '.pcb';

export function sourceKey(source: CloudSource): string {
  if (source.kind === 'url') {
    return `url:${source.url}`;
  }
  const { name, size, lastModified } = source.file;
  return `file:${name}:${size}:${lastModified}`;
}

export function sourceName(source: CloudSource): string {
  return source.kind === 'url' ? source.name : source.file.name;
}

export function isBinaryCloudFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(BINARY_EXTENSION);
}
