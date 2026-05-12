export class FileTooLargeError extends Error {
  constructor(
    public readonly actualBytes: number,
    public readonly maxBytes: number,
  ) {
    super(
      `File too large: ${actualBytes} bytes exceeds max ${maxBytes} bytes`,
    );
    this.name = 'FileTooLargeError';
  }
}

export class InvalidFileTypeError extends Error {
  constructor(
    public readonly actualType: string,
    public readonly allowedTypes: readonly string[],
  ) {
    super(
      `Invalid file type: ${actualType}. Allowed: ${allowedTypes.join(', ')}`,
    );
    this.name = 'InvalidFileTypeError';
  }
}
