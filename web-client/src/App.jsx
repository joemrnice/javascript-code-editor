import { Routes, Route } from "react-router-dom"
import JsEditor from "./pages/JsEditor"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JsEditor />} />
    </Routes>
  )
}