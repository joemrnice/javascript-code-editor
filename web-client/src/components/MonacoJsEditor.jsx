import { useRef } from "react"
import Editor from "@monaco-editor/react"

export default function MonacoJsEditor({ code, setCode }) {
  const editorRef = useRef(null)

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor
  }

  return (
    <Editor
      height="400px"
      defaultLanguage="javascript"
      theme="vs-dark"
      value={code}
      onChange={(value) => setCode(value)}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
    />
  )
}