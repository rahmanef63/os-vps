// Single host seam — every host-I/O symbol the slice touches re-exports from
// the shell barrel (a legal alias) so no other file in the slice imports a
// project @/lib path directly. Lifting this slice to the rr catalog means
// swapping THIS file for an injected adapter; every other file is unchanged.
export { useOsApi, rawUrl } from "@/features/os-shell";
export type {
  OsApi,
  FsEntry,
  FsRoot,
  FsUsage,
  UploadFile,
} from "@/features/os-shell";
