import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { FileTooLargeError, InvalidFileTypeError } from './storage.errors.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

const ALLOWED_VOICE_NOTE_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
] as const;

const MAX_FILENAME_LENGTH = 100;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SavedFile {
  /** Public URL served by nginx, e.g. https://octio.co.za/uploads/2026/04/abc-voice.webm */
  url: string;
  /** Absolute path on disk — used for POPIA deletion flows */
  absolutePath: string;
  /** Just the filename component */
  filename: string;
  sizeBytes: number;
  contentType: string;
}

export interface SaveVoiceNoteInput {
  buffer: ArrayBuffer | Buffer;
  /** Defaults to 'audio/webm' */
  contentType?: string;
}

export interface SaveAttachmentInput {
  buffer: ArrayBuffer | Buffer;
  originalName: string;
  contentType: string;
}

/** Per-call overrides — primary use case is test isolation. */
export interface StorageOptions {
  baseDir?: string;
  publicUrlBase?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map a MIME content type to a file extension (including the leading dot).
 * Returns an empty string for unknown types.
 */
function inferExtension(contentType: string): string {
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
  };
  return map[contentType] ?? '';
}

/**
 * Sanitize an original filename supplied by the user.
 *
 * - Strip directory components (path traversal protection).
 * - Reject null bytes.
 * - Replace any character that is not alphanumeric, `.`, `-`, or `_` with `-`.
 * - Cap at MAX_FILENAME_LENGTH characters.
 * - Fall back to `unnamed<ext>` when the result would otherwise be empty.
 */
function sanitizeFilename(original: string, contentType: string): string {
  // Strip null bytes
  const noNulls = original.replace(/\0/g, '');

  // Strip directory components — takes only the last segment after any separator
  const base = path.basename(noNulls);

  // Replace unsafe chars
  const safe = base.replace(/[^a-zA-Z0-9.\-_]/g, '-');

  // Cap length
  const capped = safe.slice(0, MAX_FILENAME_LENGTH);

  // Guard against empty result (e.g. empty string or whitespace-only original)
  if (!capped) {
    return `unnamed${inferExtension(contentType)}`;
  }

  return capped;
}

/** Resolve year/month subdirectory and ensure it exists. */
async function resolveUploadDir(
  baseDir: string,
  now: Date,
): Promise<string> {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dir = path.join(baseDir, year, month);
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
}

/** Convert ArrayBuffer or Buffer to a Node.js Buffer. */
function toBuffer(input: ArrayBuffer | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

/** Derive base dir and public URL base from options → config fallback. */
function resolveStorageConfig(options?: StorageOptions): {
  baseDir: string;
  publicUrlBase: string;
} {
  return {
    baseDir: options?.baseDir ?? config.uploadDir,
    publicUrlBase: options?.publicUrlBase ?? config.uploadPublicUrlBase,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist a voice note to disk and return a SavedFile descriptor.
 *
 * @param input   - Buffer + optional content type.
 * @param options - Override base dir / public URL base (useful in tests).
 */
export async function saveVoiceNote(
  input: SaveVoiceNoteInput,
  options?: StorageOptions,
): Promise<SavedFile> {
  const contentType = input.contentType ?? 'audio/webm';

  if (!(ALLOWED_VOICE_NOTE_TYPES as readonly string[]).includes(contentType)) {
    throw new InvalidFileTypeError(contentType, ALLOWED_VOICE_NOTE_TYPES);
  }

  const buf = toBuffer(input.buffer);

  if (buf.byteLength > MAX_BYTES) {
    throw new FileTooLargeError(buf.byteLength, MAX_BYTES);
  }

  const { baseDir, publicUrlBase } = resolveStorageConfig(options);
  const now = new Date();
  const uploadDir = await resolveUploadDir(baseDir, now);

  const uuid = crypto.randomUUID();
  const filename = `${uuid}-voice.webm`;
  const absolutePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(absolutePath, buf);

  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const url = `${publicUrlBase}/${year}/${month}/${filename}`;

  logger.info({ filename, sizeBytes: buf.byteLength, contentType }, 'saved upload');

  return {
    url,
    absolutePath,
    filename,
    sizeBytes: buf.byteLength,
    contentType,
  };
}

/**
 * Persist a file attachment to disk and return a SavedFile descriptor.
 *
 * @param input   - Buffer + original filename + content type.
 * @param options - Override base dir / public URL base (useful in tests).
 */
export async function saveAttachment(
  input: SaveAttachmentInput,
  options?: StorageOptions,
): Promise<SavedFile> {
  if (
    !(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(input.contentType)
  ) {
    throw new InvalidFileTypeError(input.contentType, ALLOWED_ATTACHMENT_TYPES);
  }

  const buf = toBuffer(input.buffer);

  if (buf.byteLength > MAX_BYTES) {
    throw new FileTooLargeError(buf.byteLength, MAX_BYTES);
  }

  const { baseDir, publicUrlBase } = resolveStorageConfig(options);
  const now = new Date();
  const uploadDir = await resolveUploadDir(baseDir, now);

  const uuid = crypto.randomUUID();
  const sanitized = sanitizeFilename(input.originalName, input.contentType);
  const filename = `${uuid}-${sanitized}`;
  const absolutePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(absolutePath, buf);

  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const url = `${publicUrlBase}/${year}/${month}/${filename}`;

  logger.info(
    { filename, sizeBytes: buf.byteLength, contentType: input.contentType },
    'saved upload',
  );

  return {
    url,
    absolutePath,
    filename,
    sizeBytes: buf.byteLength,
    contentType: input.contentType,
  };
}

/**
 * Delete a previously uploaded file.
 *
 * Treats ENOENT as a success — file already gone is a valid end-state
 * (idempotent POPIA deletion).
 */
export async function deleteUploadedFile(absolutePath: string): Promise<void> {
  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // File already absent — that's fine.
      return;
    }
    throw err;
  }
}
