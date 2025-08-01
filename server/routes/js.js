import { Router } from "express"
import runJs from "../utils/runJs.js"

const router = Router()

router.post("/run-js", async (req, res) => {
  const { code } = req.body

  if (!code || typeof code !== "string" || code.length > 10000) {
    return res.status(400).json({ output: "Invalid or too large code input" })
  }

  try {
    const result = await runJs(code)
    res.json(result)
  } catch (err) {
    res.status(500).json({ output: "Server Error:\n" + err.message })
  }
})

export default router