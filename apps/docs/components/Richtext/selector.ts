export const superscriptSelector = (ctx) => {
  const editor = ctx.editor;
  if (!editor) return {};
  return {
    isSuperscript: editor.isActive("superscript"),
    canSuperscript: editor.can().chain().toggleSuperscript().run(),
  };
};
