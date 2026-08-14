import React, { useRef, useEffect } from "react";
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
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  const handleEditorChange = (newValue) => {
    if (onChange) {
      onChange(newValue || "");
    }
  };

  const handleEditorOnMount = (editor, monaco) => {
    editorRef.current = editor;
    registerPythonCompletionProvider(monaco);
    requestAnimationFrame(() => {
      editor.layout();
    });
  };

  useEffect(() => {
    let animId;
    const updateLayout = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    };

    window.addEventListener("resize", updateLayout);

    let observer;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateLayout);
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateLayout);
      if (observer) observer.disconnect();
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Editor
        height="100%"
        width="100%"
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
          automaticLayout: false,
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
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            vertical: "auto",
            horizontal: "auto",
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full text-slate-400 font-mono text-xs">
            Loading Python Monaco Editor...
          </div>
        }
      />
    </div>
  );
};

export default PythonEditor;
