import express from "express"
import cors from "cors"
import jsRoutes from "./routes/js.js"

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ limit: "1mb" }))
app.use("/", jsRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})