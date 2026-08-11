import React from "react";
import Editor from "@monaco-editor/react";
import { registerPythonCompletionProvider } from "./PythonCompletionProvider";

/**
 * Reusable Python Monaco Editor Component with IntelliSense completion
 * 
 * Props:
 * - value: string (current Python code)
 * - onChange: function(newValue) (callback when code changes)
 * - theme: string (optional Monaco theme, defaults to 'vs-dark')
 * - readOnly: boolean (optional read-only mode)
 */
const PythonEditor = ({ value = "", onChange, theme = "vs-dark", readOnly = false }) => {
  const handleEditorChange = (newValue) => {
    if (onChange) {
      onChange(newValue || "");
    }
  };

  const handleEditorOnMount = (editor, monaco) => {
    registerPythonCompletionProvider(monaco);
  };

  return (
    <Editor
      height="100%"
      language="python"
      theme={theme}
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorOnMount}
      options={{
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        lineNumbers: "on",
        tabSize: 4,
        insertSpaces: true,
        autoIndent: "full",
        formatOnType: true,
        formatOnPaste: true,
        useTabStops: true,
        smartIndent: true,
        cursorBlinking: "smooth",
        smoothScrolling: true,
        readOnly: readOnly,
        padding: { top: 12, bottom: 12 },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
      loading={
        <div className="flex items-center justify-center h-full text-slate-400 font-mono text-xs">
          Loading Python Monaco Editor...
        </div>
      }
    />
  );
};

export default PythonEditor;
