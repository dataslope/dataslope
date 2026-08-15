/**
 * In-memory OPFS mock for unit tests: simulates the FileSystem Access API
 * surface the OPFS modules use (directory/file handles, writable streams,
 * File). Stub navigator.storage.getDirectory to resolve makeOpfsRoot().
 */

export interface MockFile {
  /** Raw bytes / text stored by the last write. */
  content: Uint8Array | string;
}

export interface MockDir {
  files: Map<string, MockFile>;
  dirs: Map<string, MockDir>;
}

function makeDir(): MockDir {
  return { files: new Map(), dirs: new Map() };
}

// ---------------------------------------------------------------------------
// FileSystemWritableFileStream
// ---------------------------------------------------------------------------

function makeWritable(file: MockFile): object {
  return {
    async write(data: string | ArrayBuffer | Uint8Array): Promise<void> {
      if (typeof data === "string") {
        file.content = data;
      } else if (data instanceof Uint8Array) {
        file.content = data;
      } else {
        file.content = new Uint8Array(data);
      }
    },
    async close(): Promise<void> {
      /* no-op */
    },
  };
}

// ---------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------

function makeFile(mockFile: MockFile): object {
  return {
    async text(): Promise<string> {
      if (typeof mockFile.content === "string") return mockFile.content;
      return new TextDecoder().decode(mockFile.content);
    },
    async arrayBuffer(): Promise<ArrayBuffer> {
      if (typeof mockFile.content === "string") {
        return new TextEncoder().encode(mockFile.content).buffer as ArrayBuffer;
      }
      return mockFile.content.buffer as ArrayBuffer;
    },
  };
}

// ---------------------------------------------------------------------------
// FileSystemFileHandle
// ---------------------------------------------------------------------------

function makeFileHandle(mockFile: MockFile): object {
  return {
    // Callers branch on `kind` to tell files from directories while walking
    // a tree (see copyDirectoryHandle), so the mock must carry it.
    kind: "file" as const,
    async getFile() {
      return makeFile(mockFile);
    },
    async createWritable() {
      return makeWritable(mockFile);
    },
  };
}

// ---------------------------------------------------------------------------
// FileSystemDirectoryHandle
// ---------------------------------------------------------------------------

function makeDirHandle(dir: MockDir): object {
  const handle: object = {
    kind: "directory" as const,
    async getDirectoryHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<object> {
      if (!dir.dirs.has(name)) {
        if (!options?.create) {
          throw new DOMException(`Not found: ${name}`, "NotFoundError");
        }
        dir.dirs.set(name, makeDir());
      }
      return makeDirHandle(dir.dirs.get(name)!);
    },

    async getFileHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<object> {
      if (!dir.files.has(name)) {
        if (!options?.create) {
          throw new DOMException(`Not found: ${name}`, "NotFoundError");
        }
        dir.files.set(name, { content: "" });
      }
      return makeFileHandle(dir.files.get(name)!);
    },

    async removeEntry(
      name: string,
      options?: { recursive?: boolean },
    ): Promise<void> {
      if (dir.dirs.has(name)) {
        if (!options?.recursive) {
          // Check if non-empty (simplification: always allow recursive removal)
        }
        dir.dirs.delete(name);
      } else if (dir.files.has(name)) {
        dir.files.delete(name);
      } else {
        throw new DOMException(`Not found: ${name}`, "NotFoundError");
      }
    },

    /** Async iteration over entries: yields [name, handle] pairs. */
    async *[Symbol.asyncIterator](): AsyncGenerator<[string, object]> {
      for (const [name, subDir] of dir.dirs) {
        yield [name, makeDirHandle(subDir)];
      }
      for (const [name, file] of dir.files) {
        yield [name, makeFileHandle(file)];
      }
    },
  };
  return handle;
}

// ---------------------------------------------------------------------------
// Root factory
// ---------------------------------------------------------------------------

/** Creates a fresh in-memory OPFS root directory handle. */
export function makeOpfsRoot(): object {
  return makeDirHandle(makeDir());
}

/** Reads the raw MockDir tree from a root created by makeOpfsRoot.
 *  Used in tests to inspect internal state without going through the API. */
export function _getRootDir(root: object): MockDir {
  // Intentionally unimplemented; makeOpfsRootWithRef() exposes the MockDir.
  void root;
  throw new Error("Use makeOpfsRootWithRef() for internal inspection.");
}

/** Returns both the handle and the underlying MockDir for test inspection. */
export function makeOpfsRootWithRef(): { handle: object; dir: MockDir } {
  const dir = makeDir();
  return { handle: makeDirHandle(dir), dir };
}
