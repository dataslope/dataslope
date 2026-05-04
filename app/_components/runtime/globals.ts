// Intentionally left near-empty: editors now hold real `EditorView`
// instances from `@codemirror/view`, so the v5-shaped `CodeMirrorAPI` /
// `CodeMirrorEditor` shims that used to live here are gone. Code that
// needs editor types should import them from `@codemirror/view` /
// `@codemirror/state` directly.
export {};
