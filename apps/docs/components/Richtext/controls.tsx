export const SuperscriptControl = {
  render: (editor, editorState) => {
    return (
      <div>
        <button
          onClick={() => {
            editor.chain().focus().toggleSuperscript().run();
          }}
          style={
            editorState.isSuperscript ? { color: "blue" } : { color: "black" }
          }
        >
          Superscript
        </button>
      </div>
    );
  },
};
