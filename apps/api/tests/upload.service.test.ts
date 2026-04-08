import { Buffer } from "node:buffer";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RealtimeEventsService } from "../src/realtime/realtime-events.service";
import { SocialService } from "../src/social/social.service";
import { MemoryStoreService } from "../src/store/memory-store.service";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9c7lQAAAAASUVORK5CYII=",
  "base64"
);

function createUploadFile(input: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}) {
  return {
    fieldname: "file",
    originalname: input.fileName,
    encoding: "7bit",
    mimetype: input.mimeType,
    size: input.size,
    destination: "",
    filename: input.fileName,
    path: "",
    stream: undefined,
    buffer: input.buffer
  } as Express.Multer.File;
}

describe("upload service", () => {
  let uploadsDir: string;
  let service: SocialService;
  let store: MemoryStoreService;
  let userId: number;

  beforeEach(() => {
    uploadsDir = mkdtempSync(path.join(tmpdir(), "cx-api-upload-service-"));
    process.env.UPLOADS_DIR = uploadsDir;
    store = new MemoryStoreService();
    service = new SocialService(store, new RealtimeEventsService());
    userId = store.ensureTestPresetUser("fresh-user").id;
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIR;
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it("rejects non-image uploads", async () => {
    await expect(
      service.uploadImage(
        userId,
        createUploadFile({
          fileName: "hello.txt",
          mimeType: "text/plain",
          size: 5,
          buffer: Buffer.from("hello")
        })
      )
    ).rejects.toThrow("仅支持图片上传");
  });

  it("rejects oversized images", async () => {
    await expect(
      service.uploadImage(
        userId,
        createUploadFile({
          fileName: "too-large.png",
          mimeType: "image/png",
          size: 10 * 1024 * 1024 + 1,
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1)
        })
      )
    ).rejects.toThrow("图片不能超过 10MB");
  });

  it("stores valid images and returns an upload record", async () => {
    const result = await service.uploadImage(
      userId,
      createUploadFile({
        fileName: "avatar.png",
        mimeType: "image/png",
        size: ONE_PIXEL_PNG.length,
        buffer: ONE_PIXEL_PNG
      })
    );

    expect(result.upload.mimeType).toBe("image/png");
    expect(result.upload.url).toMatch(/^\/static\/uploads\//);

    const diskFileName = result.upload.url.replace("/static/uploads/", "");
    expect(existsSync(path.join(uploadsDir, diskFileName))).toBe(true);
  });
});
