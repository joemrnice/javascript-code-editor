import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const runJs = (code) => {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, "..", "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Create unique filename
    const filename = `script-${Date.now()}.js`
    const filePath = path.join(tempDir, filename)

    fs.writeFile(filePath, code, (writeErr) => {
      if (writeErr) {
        return reject(writeErr)
      }

      const runCommand = `node "${filePath}"`
      
      exec(runCommand, { timeout: 5000 }, (err, stdout, stderr) => {
        // Clean up regardless of execution result
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Cleanup error:", unlinkErr.message)
        })

        if (err) {
          if (err.killed && err.signal === "SIGTERM") {
            return resolve({ output: "Execution timed out (5000ms)" })
          }
          return resolve({ output: "Runtime Error:\n" + (err.message || stderr) })
        }

        resolve({ output: stdout || stderr })
      })
    })
  })
}

export default runJs