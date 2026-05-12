import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  saveVoiceNote,
  saveAttachment,
  deleteUploadedFile,
} from './storage.js';
import { FileTooLargeError, InvalidFileTypeError } from './storage.errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptions() {
  const baseDir = path.join(os.tmpdir(), `storage-test-${crypto.randomUUID()}`);
  const publicUrlBase = 'http://test.local/uploads';
  return { baseDir, publicUrlBase };
}

function smallBuffer(sizeBytes = 1024): Buffer {
  return Buffer.alloc(sizeBytes, 0x00);
}

function largeBuffer(): Buffer {
  // 11 MB — exceeds the 10 MB cap
  return Buffer.alloc(11 * 1024 * 1024, 0x00);
}

function yearMonth(): { year: string; month: string } {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('saveVoiceNote', () => {
  let options: ReturnType<typeof makeOptions>;

  beforeEach(() => {
    options = makeOptions();
  });

  afterEach(async () => {
    // Clean up the temp dir we created for this test
    await fs.promises.rm(options.baseDir, { recursive: true, force: true });
  });

  it('saves a webm buffer and returns correct SavedFile fields', async () => {
    const buf = smallBuffer();
    const result = await saveVoiceNote(
      { buffer: buf, contentType: 'audio/webm' },
      options,
    );

    const { year, month } = yearMonth();
    const expectedDir = path.join(options.baseDir, year, month);
    const expectedUrlPrefix = `${options.publicUrlBase}/${year}/${month}/`;

    expect(result.sizeBytes).toBe(buf.byteLength);
    expect(result.contentType).toBe('audio/webm');
    expect(result.filename).toMatch(/^[0-9a-f-]+-voice\.webm$/);
    expect(result.url).toMatch(new RegExp(`^${expectedUrlPrefix}`));
    expect(result.absolutePath).toMatch(
      new RegExp(`^${expectedDir.replace(/[/\\]/g, path.sep === '\\' ? '\\\\' : '/')}`),
    );

    // File must actually exist on disk
    const stat = await fs.promises.stat(result.absolutePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBe(buf.byteLength);
  });

  it('defaults content type to audio/webm when not provided', async () => {
    const result = await saveVoiceNote({ buffer: smallBuffer() }, options);
    expect(result.contentType).toBe('audio/webm');
  });

  it('accepts audio/ogg and audio/mp4 (iOS Safari)', async () => {
    for (const ct of ['audio/ogg', 'audio/mp4']) {
      const result = await saveVoiceNote(
        { buffer: smallBuffer(), contentType: ct },
        options,
      );
      expect(result.contentType).toBe(ct);
    }
  });

  it('throws FileTooLargeError for an 11 MB buffer', async () => {
    const buf = largeBuffer();
    const err = await saveVoiceNote(
      { buffer: buf, contentType: 'audio/webm' },
      options,
    ).catch((e) => e);

    expect(err).toBeInstanceOf(FileTooLargeError);
    expect((err as FileTooLargeError).actualBytes).toBe(buf.byteLength);
    expect((err as FileTooLargeError).maxBytes).toBe(10 * 1024 * 1024);
  });

  it('throws InvalidFileTypeError for unsupported MIME type', async () => {
    const err = await saveVoiceNote(
      { buffer: smallBuffer(), contentType: 'audio/x-wav' },
      options,
    ).catch((e) => e);

    expect(err).toBeInstanceOf(InvalidFileTypeError);
    expect((err as InvalidFileTypeError).actualType).toBe('audio/x-wav');
  });
});

describe('saveAttachment', () => {
  let options: ReturnType<typeof makeOptions>;

  beforeEach(() => {
    options = makeOptions();
  });

  afterEach(async () => {
    await fs.promises.rm(options.baseDir, { recursive: true, force: true });
  });

  it('saves a PDF buffer and returns correct SavedFile fields', async () => {
    const buf = smallBuffer(2048);
    const result = await saveAttachment(
      { buffer: buf, originalName: 'quote.pdf', contentType: 'application/pdf' },
      options,
    );

    const { year, month } = yearMonth();
    const expectedUrlPrefix = `${options.publicUrlBase}/${year}/${month}/`;

    expect(result.sizeBytes).toBe(buf.byteLength);
    expect(result.contentType).toBe('application/pdf');
    expect(result.filename).toContain('quote.pdf');
    expect(result.url).toMatch(new RegExp(`^${expectedUrlPrefix}`));

    const stat = await fs.promises.stat(result.absolutePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBe(buf.byteLength);
  });

  it('throws FileTooLargeError with correct byte counts for 11 MB buffer', async () => {
    const buf = largeBuffer();
    const err = await saveAttachment(
      { buffer: buf, originalName: 'big.pdf', contentType: 'application/pdf' },
      options,
    ).catch((e) => e);

    expect(err).toBeInstanceOf(FileTooLargeError);
    expect((err as FileTooLargeError).actualBytes).toBe(buf.byteLength);
    expect((err as FileTooLargeError).maxBytes).toBe(10 * 1024 * 1024);
  });

  it('throws InvalidFileTypeError for application/x-executable', async () => {
    const err = await saveAttachment(
      {
        buffer: smallBuffer(),
        originalName: 'malware.exe',
        contentType: 'application/x-executable',
      },
      options,
    ).catch((e) => e);

    expect(err).toBeInstanceOf(InvalidFileTypeError);
    expect((err as InvalidFileTypeError).actualType).toBe(
      'application/x-executable',
    );
  });

  it('sanitizes path-traversal original name ../../etc/passwd', async () => {
    const result = await saveAttachment(
      {
        buffer: smallBuffer(),
        originalName: '../../etc/passwd',
        contentType: 'text/plain',
      },
      options,
    );

    // The final filename must NOT contain any directory separator or ".."
    expect(result.filename).not.toContain('..');
    expect(result.filename).not.toContain('/');
    expect(result.filename).not.toContain('\\');
    // The sanitized portion should derive from "passwd" (last segment)
    expect(result.filename).toContain('passwd');
  });

  it('truncates a 300-character original name to 100 chars', async () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = await saveAttachment(
      {
        buffer: smallBuffer(),
        originalName: longName,
        contentType: 'application/pdf',
      },
      options,
    );

    // UUID prefix is 36 chars + '-' separator; the sanitized part ≤ 100 chars
    const parts = result.filename.split('-');
    // Reconstruct the sanitized portion (everything after the UUID prefix)
    const uuidPart = parts.slice(0, 5).join('-'); // UUID is 8-4-4-4-12
    const sanitizedPart = result.filename.slice(uuidPart.length + 1);
    expect(sanitizedPart.length).toBeLessThanOrEqual(100);
  });

  it('falls back to unnamed.pdf when originalName is empty', async () => {
    const result = await saveAttachment(
      { buffer: smallBuffer(), originalName: '', contentType: 'application/pdf' },
      options,
    );

    // Filename must include 'unnamed.pdf' as the sanitized portion
    expect(result.filename).toContain('unnamed.pdf');
    expect(result.filename).not.toMatch(/^[a-f0-9-]+-$/); // no trailing dash with empty part

    const stat = await fs.promises.stat(result.absolutePath);
    expect(stat.isFile()).toBe(true);
  });

  it('accepts all allowed attachment MIME types without throwing', async () => {
    const types: Array<[string, string]> = [
      ['application/pdf', 'file.pdf'],
      ['application/msword', 'file.doc'],
      [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'file.docx',
      ],
      ['text/plain', 'file.txt'],
      ['image/jpeg', 'photo.jpg'],
      ['image/png', 'photo.png'],
      ['image/gif', 'anim.gif'],
      ['image/webp', 'photo.webp'],
    ];

    for (const [contentType, originalName] of types) {
      await expect(
        saveAttachment({ buffer: smallBuffer(), originalName, contentType }, options),
      ).resolves.toBeDefined();
    }
  });
});

describe('deleteUploadedFile', () => {
  let options: ReturnType<typeof makeOptions>;

  beforeEach(() => {
    options = makeOptions();
  });

  afterEach(async () => {
    await fs.promises.rm(options.baseDir, { recursive: true, force: true });
  });

  it('deletes a previously saved file', async () => {
    const result = await saveVoiceNote(
      { buffer: smallBuffer(), contentType: 'audio/webm' },
      options,
    );

    // File exists before deletion
    await expect(fs.promises.access(result.absolutePath)).resolves.toBeUndefined();

    await deleteUploadedFile(result.absolutePath);

    // File is gone after deletion
    await expect(fs.promises.access(result.absolutePath)).rejects.toThrow();
  });

  it('does NOT throw when the target file does not exist (idempotent)', async () => {
    const fakePath = path.join(os.tmpdir(), `nonexistent-${crypto.randomUUID()}.webm`);
    await expect(deleteUploadedFile(fakePath)).resolves.toBeUndefined();
  });
});
