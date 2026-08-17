import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";

export interface StorageEngine<T> {
  load(): T;
  save(data: T): void;
  flush(): void;
}

export class JSONStorageEngine<T> implements StorageEngine<T> {
  private filePath: string;
  private data: T;
  private dirty = false;
  private defaultData: T;

  constructor(filePath: string, defaultData: T) {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.data = defaultData;
    this.init();
  }
  private init(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw) as T;
      }
    } catch (e) { console.error("Storage init error:", e); }
    finally {
      if (this.data === null || this.data === undefined) this.data = this.defaultData;
      this.flush();
    }
  }
  load(): T { return JSON.parse(JSON.stringify(this.data)) as T; }
  save(data: T): void { this.data = data; this.dirty = true; this.flush(); }
  flush(): void {
    if (!this.dirty) return;
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
      this.dirty = false;
    } catch (e) { console.error("Storage flush error:", e); }
  }
}

export class BinaryStorageEngine<T> implements StorageEngine<T> {
  private filePath: string;
  private data: T;
  private dirty = false;
  private defaultData: T;

  constructor(filePath: string, defaultData: T) {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.data = defaultData;
    this.init();
  }
  private init(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath);
        const inflated = inflateSync(raw);
        const str = inflated.toString("utf-8");
        this.data = JSON.parse(str) as T;
      }
    } catch (e) { console.error("Binary storage init error:", e); }
    finally {
      if (this.data === null || this.data === undefined) this.data = this.defaultData;
      this.flush();
    }
  }
  load(): T { return JSON.parse(JSON.stringify(this.data)) as T; }
  save(data: T): void { this.data = data; this.dirty = true; this.flush(); }
  flush(): void {
    if (!this.dirty) return;
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const compressed = deflateSync(Buffer.from(JSON.stringify(this.data)));
      writeFileSync(this.filePath, compressed);
      this.dirty = false;
    } catch (e) { console.error("Binary storage flush error:", e); }
  }
}

export class EncryptedStorageEngine<T> implements StorageEngine<T> {
  private filePath: string;
  private data: T;
  private dirty = false;
  private defaultData: T;
  private key: Buffer;

  constructor(filePath: string, defaultData: T, password: string = "mongodblite-secure-default") {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.data = defaultData;
    this.key = Buffer.from(createHash("sha256").update(password).digest());
    this.init();
  }
  private init(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath);
        const iv = raw.slice(0, 16);
        const encrypted = raw.slice(16);
        const decipher = createDecipheriv("aes-256-cbc", this.key.slice(0, 32), iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        const str = decrypted.toString("utf-8");
        this.data = JSON.parse(str) as T;
      }
    } catch (e) { console.error("Encrypted storage init error:", e); }
    finally {
      if (this.data === null || this.data === undefined) this.data = this.defaultData;
      this.flush();
    }
  }
  load(): T { return JSON.parse(JSON.stringify(this.data)) as T; }
  save(data: T): void { this.data = data; this.dirty = true; this.flush(); }
  flush(): void {
    if (!this.dirty) return;
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-cbc", this.key.slice(0, 32), iv);
      let encrypted = cipher.update(Buffer.from(JSON.stringify(this.data), "utf-8"));
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const combined = Buffer.concat([iv, encrypted]);
      writeFileSync(this.filePath, combined);
      this.dirty = false;
    } catch (e) { console.error("Encrypted storage flush error:", e); }
  }
}