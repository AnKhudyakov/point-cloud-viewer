export interface ByteSize {
  value: string;
  unit: 'kb' | 'mb' | 'gb';
}

export function splitBytes(bytes: number): ByteSize {
  if (bytes >= 1024 ** 3) {
    return { value: (bytes / 1024 ** 3).toFixed(2), unit: 'gb' };
  }
  if (bytes >= 1024 ** 2) {
    return { value: (bytes / 1024 ** 2).toFixed(1), unit: 'mb' };
  }
  return { value: (bytes / 1024).toFixed(1), unit: 'kb' };
}
