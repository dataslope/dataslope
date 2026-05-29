/**
 * DuckDB Files Panel — re-exports the shared FilesPanel component.
 *
 * The canonical implementation lives in `app/_components/files/FilesPanel.tsx`
 * (with `playground-files-*` CSS classes).  DuckDbPlayground imports from here so
 * existing import paths continue to work.
 */
export { FilesPanel, type VirtualFile } from "../files/FilesPanel";
