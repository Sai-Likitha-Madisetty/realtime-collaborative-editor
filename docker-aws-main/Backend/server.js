import "dotenv/config"
import { randomInt, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import bcrypt from "bcryptjs"
import express from "express"
import rateLimit from "express-rate-limit"
import jwt from "jsonwebtoken"
import { createServer } from "node:http"
import { Server } from "socket.io"
import { removeAwarenessStates } from "y-protocols/awareness"
import { YSocketIO } from "y-socket.io/dist/server"

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
})
const dataDirectory = join(dirname(fileURLToPath(import.meta.url)), "data")
const roomsFile = join(dataDirectory, "rooms.json")
const yjsDirectory = join(dataDirectory, "yjs")
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.")
}

mkdirSync(yjsDirectory, { recursive: true })

const rooms = new Map()
if (existsSync(roomsFile)) {
  const savedRooms = JSON.parse(readFileSync(roomsFile, "utf8"))
  if (!Array.isArray(savedRooms)) {
    throw new Error("Room metadata is invalid; expected a JSON array.")
  }
  for (const room of savedRooms) {
    if (typeof room.id !== "string" || typeof room.name !== "string") {
      throw new Error("Room metadata contains an invalid entry.")
    }
    rooms.set(room.id, room)
  }
}

function persistRooms() {
  const temporaryFile = `${roomsFile}.tmp`
  writeFileSync(temporaryFile, JSON.stringify([...rooms.values()], null, 2), "utf8")
  renameSync(temporaryFile, roomsFile)
}

function signRoomToken(roomId, username) {
  return jwt.sign({ roomId, username }, jwtSecret, { expiresIn: "12h" })
}

function verifyRoomToken(token) {
  if (typeof token !== "string") return null
  try {
    const claims = jwt.verify(token, jwtSecret)
    if (typeof claims === "string" || typeof claims.roomId !== "string" || typeof claims.username !== "string") {
      return null
    }
    return claims
  } catch {
    return null
  }
}

function requireRoomToken(req, res, next) {
  const authorization = req.get("authorization") || ""
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
  const claims = verifyRoomToken(token)
  if (!claims || !rooms.has(claims.roomId) || (req.params.id && req.params.id.toUpperCase() !== claims.roomId)) {
    return res.status(401).json({ error: "Your room session is invalid or has expired. Join the room again." })
  }
  req.roomClaims = claims
  next()
}

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many join attempts. Please wait a few minutes and try again." }
})
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many code runs. Please wait a moment and try again." }
})

app.disable("x-powered-by")
app.use(express.json({ limit: "256kb" }))

app.get("/health", (_req, res) => {
  res.status(200).json({ message: "ok", success: true })
})

app.post("/api/rooms", async (req, res, next) => {
  try {
    const body = req.body || {}
    if ((body.name !== undefined && typeof body.name !== "string") ||
      (body.password !== undefined && typeof body.password !== "string")) {
      return res.status(400).json({ error: "Room name and password must be text." })
    }
    const username = typeof body.username === "string" ? body.username.trim() : ""
    const roomName = body.name?.trim() || ""
    const password = body.password || ""
    if (!username || username.length > 40 || roomName.length > 80 || password.length > 128) {
      return res.status(400).json({ error: "Enter a name (up to 40 characters) and valid room details." })
    }

    let id
    do {
      const characters = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
      id = Array.from({ length: 6 }, () => characters[randomInt(characters.length)]).join("")
    } while (rooms.has(id))

    const room = {
      id,
      name: roomName || `${username}'s room`,
      passwordHash: password ? await bcrypt.hash(password, 12) : null,
      createdAt: new Date().toISOString()
    }
    rooms.set(id, room)
    persistRooms()
    res.status(201).json({
      room: { id: room.id, name: room.name },
      token: signRoomToken(id, username)
    })
  } catch (error) {
    next(error)
  }
})

app.post("/api/rooms/:id/join", joinLimiter, async (req, res, next) => {
  try {
    const body = req.body || {}
    if (body.password !== undefined && body.password !== null && typeof body.password !== "string") {
      return res.status(400).json({ error: "Password must be text." })
    }
    const id = typeof req.params.id === "string" ? req.params.id.toUpperCase() : ""
    const username = typeof body.username === "string" ? body.username.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!/^[23456789A-HJ-NP-Z]{6}$/.test(id)) {
      return res.status(404).json({ error: "Room not found. Check the room code and try again." })
    }
    if (!username || username.length > 40) {
      return res.status(400).json({ error: "Enter a name up to 40 characters long." })
    }
    const room = rooms.get(id)
    if (!room) {
      return res.status(404).json({ error: "Room not found. Check the room code and try again." })
    }
    if (room.passwordHash && !password) {
      return res.status(401).json({ error: "This room requires a password.", passwordRequired: true })
    }
    if (room.passwordHash && !(await bcrypt.compare(password, room.passwordHash))) {
      return res.status(401).json({ error: "That password is incorrect." })
    }
    res.json({
      room: { id: room.id, name: room.name },
      token: signRoomToken(id, username)
    })
  } catch (error) {
    next(error)
  }
})

app.get("/api/rooms/:id", requireRoomToken, (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase())
  if (!room) return res.status(404).json({ error: "Room not found." })
  res.json({ room: { id: room.id, name: room.name } })
})

const ySocketIO = new YSocketIO(io, { levelPersistenceDir: yjsDirectory })
const awarenessUpdateListeners = new Map()
ySocketIO.on("document-destroy", (document) => {
  const listener = awarenessUpdateListeners.get(document)
  if (listener) {
    document.awareness.off("update", listener)
    awarenessUpdateListeners.delete(document)
  }
})
ySocketIO.on("document-loaded", (document) => {
  const clientsBySocket = new Map()
  const trackAwarenessClients = ({ added, updated, removed }, origin) => {
    const clientId = origin?.data?.awarenessClientId
    if (typeof origin?.id !== "string" || !Number.isSafeInteger(clientId)) return
    if (removed.includes(clientId)) {
      clientsBySocket.delete(origin.id)
      return
    }
    if (!added.includes(clientId) && !updated.includes(clientId)) return
    if (!clientsBySocket.has(origin.id)) {
      clientsBySocket.set(origin.id, clientId)
      origin.once("disconnect", () => {
        removeAwarenessStates(document.awareness, [clientId], origin)
        clientsBySocket.delete(origin.id)
      })
    }
  }
  document.awareness.on("update", trackAwarenessClients)
  awarenessUpdateListeners.set(document, trackAwarenessClients)
})
ySocketIO.initialize()

ySocketIO.nsp.use((socket, next) => {
  const claims = verifyRoomToken(socket.handshake.auth?.token)
  const roomId = socket.nsp.name.replace(/^\/yjs\|/, "")
  if (!claims || claims.roomId !== roomId || !rooms.has(roomId)) {
    return next(new Error("Unauthorized room connection."))
  }
  const awarenessClientId = socket.handshake.auth?.clientId
  if (!Number.isSafeInteger(awarenessClientId)) {
    return next(new Error("Invalid awareness client ID."))
  }
  socket.data.awarenessClientId = awarenessClientId
  next()
})

app.post("/api/run", requireRoomToken, runLimiter, async (req, res, next) => {
  const body = req.body || {}
  const language = typeof body.language === "string" ? body.language : ""
  const code = typeof body.code === "string" ? body.code : ""
  const supportedLanguages = ["JavaScript", "TypeScript", "Python", "C++", "Java", "Go"]
  if (!supportedLanguages.includes(language)) return res.status(400).json({ error: "Choose a supported language." })
  if (!code.trim()) return res.status(400).json({ error: "Add some code before running it." })
  if (Buffer.byteLength(code, "utf8") > 50_000) {
    return res.status(413).json({ error: "Code must be 50 KB or smaller." })
  }

  const judgeUrl = (process.env.JUDGE0_URL || "https://ce.judge0.com").replace(/\/+$/, "")
  const controller = new AbortController()
  const requestTimeout = setTimeout(() => controller.abort(), 35_000)
  try {
    const languageResponse = await fetch(`${judgeUrl}/languages`, { signal: controller.signal })
    if (!languageResponse.ok) throw new Error(`Judge0 language lookup failed (${languageResponse.status}).`)
    const availableLanguages = await languageResponse.json()
    const judgeLanguage = availableLanguages.find((entry) => {
      const name = entry.name.toLowerCase()
      const requested = language.toLowerCase()
      return name === requested || name.startsWith(`${requested} (`)
    })
    if (!judgeLanguage) {
      return res.status(503).json({ error: `${language} is not available on the configured Judge0 server.` })
    }

    const submissionResponse = await fetch(`${judgeUrl}/submissions?base64_encoded=false&wait=false`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language_id: judgeLanguage.id, source_code: code }),
      signal: controller.signal
    })
    if (!submissionResponse.ok) throw new Error(`Judge0 rejected the submission (${submissionResponse.status}).`)
    const { token } = await submissionResponse.json()
    if (typeof token !== "string") throw new Error("Judge0 returned an invalid submission token.")

    const deadline = Date.now() + 25_000
    let result
    do {
      await new Promise((resolve) => setTimeout(resolve, 750))
      const pollResponse = await fetch(`${judgeUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=false`, { signal: controller.signal })
      if (!pollResponse.ok) throw new Error(`Judge0 status lookup failed (${pollResponse.status}).`)
      result = await pollResponse.json()
    } while (result.status?.id < 3 && Date.now() < deadline)

    res.json({
      id: randomUUID(),
      language,
      username: req.roomClaims.username,
      status: result.status?.description || "Processing",
      output: result.stdout || result.compile_output || result.stderr || "",
      time: result.time || null,
      memory: result.memory || null,
      finishedAt: new Date().toISOString()
    })
  } catch (error) {
    if (controller.signal.aborted) {
      return res.status(504).json({ error: "Code execution took too long to respond. Please try again." })
    }
    console.error("Judge0 request failed:", error.message)
    res.status(502).json({ error: "The code execution service is temporarily unavailable. Please try again." })
  } finally {
    clearTimeout(requestTimeout)
  }
})

const publicDirectory = join(dirname(fileURLToPath(import.meta.url)), "public")
app.use(express.static(publicDirectory))
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health" || req.path.startsWith("/socket.io/")) {
    return next()
  }
  res.sendFile(join(publicDirectory, "index.html"), (error) => {
    if (error) next(error)
  })
})
app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message)
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500
  res.status(status).json({ error: status === 400 ? "The request body is invalid." : "The server could not complete the request. Please try again." })
})

const port = Number(process.env.PORT) || 3000
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
