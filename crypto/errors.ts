export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CryptoError";
  }
}

export class KeyDerivationError extends CryptoError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "KeyDerivationError";
  }
}

export class EncryptionError extends CryptoError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends CryptoError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DecryptionError";
  }
}

export class KeyImportError extends CryptoError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "KeyImportError";
  }
}

export class KeyExportError extends CryptoError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "KeyExportError";
  }
}

export class CryptoConfigError extends CryptoError {
  constructor(message: string) {
    super(message);
    this.name = "CryptoConfigError";
  }
}
