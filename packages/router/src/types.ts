import type { Data } from "@puckeditor/core";

/**
 * A page defined in code via {@link definePage}. Code pages are *seeds*: they
 * render until someone edits the path, at which point the page forks into the
 * store and the store wins from then on.
 */
export type PageSource<UserData extends Data = Data> = {
  path: string;
  data: UserData;
  /** Stable hash of `data`, used to detect drift after a fork. */
  sourceHash: string;
};

/** A page that has been written to the store — i.e. one a user has published. */
export type StoredPage<UserData extends Data = Data> = {
  data: UserData;
  /**
   * The `sourceHash` of the code page this was forked from, if any. Absent when
   * the page was created in the editor rather than forked from code.
   */
  forkedFromHash?: string;
};

export type PageStore<UserData extends Data = Data> = {
  get(path: string): Promise<StoredPage<UserData> | null>;
  set(path: string, page: StoredPage<UserData>): Promise<void>;
  list(): Promise<string[]>;
};

/** Where the resolved data came from. */
export type PageOrigin = "store" | "code" | "new";

export type PageMode = "render" | "edit";

export type ResolvedPage<UserData extends Data = Data> = {
  path: string;
  mode: PageMode;
  data: UserData;
  origin: PageOrigin;
  /** True when the code page has changed since this page was forked. */
  drift: boolean;
};

/** Code pages keyed by their resolved path. */
export type PageMap<UserData extends Data = Data> = Record<
  string,
  PageSource<UserData>
>;

/** Either the barrel array a user exports, or a pre-built index. */
export type Pages<UserData extends Data = Data> =
  | PageSource<UserData>[]
  | PageMap<UserData>;
