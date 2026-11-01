import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Code2,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  LoaderCircle,
  Play,
  UsersRound,
  Wifi,
  X
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { copyText } from "./clipboard.js"

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" }
]
const editorOptions = {
  automaticLayout: true,
  fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: 13,
  lineHeight: 22,
  minimap: { enabled: false },
  padding: { top: 16 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  tabSize: 2,
  wordWrap: "on"
}
const userColors = ["#9ab6ff", "#a2d4b8", "#e7b784", "#d4a9e8", "#e7a5a5", "#83d0d0"]

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
}

function validColor(color) {
  return typeof color === "string" && /^#[\da-f]{6}$/i.test(color) ? color : "#9ab6ff"
}

function remoteCursorStyles(users) {
  return users.map((user) => {
    const cleanName = user.username.slice(0, 40).split("").filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    }).join("")
    const name = JSON.stringify(cleanName)
    const color = validColor(user.color)
    return `.yRemoteSelection-${user.id}{background-color:${color}30}.yRemoteSelectionHead-${user.id}{border-left:2px solid ${color};height:100%;box-sizing:border-box}.yRemoteSelectionHead-${user.id}::after{content:${name};position:absolute;top:-1.45em;left:-2px;padding:2px 6px;border-radius:3px;color:#101113;background:${color};font:10px/1.4 Inter,system-ui,sans-serif;white-space:nowrap}`
  }).join("\n")
}

function OutputPanel({ isOpen, onClose, result }) {
  return (
    <section className={`output-panel ${isOpen ? "output-panel-open" : ""}`} aria-label="Shared output" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="output-header">
        <div className="output-heading">
          <strong>Output</strong>
          {result && <span className="output-run-by">Last run by {result.username}</span>}
        </div>
        <button type="button" className="icon-button output-close" onClick={onClose} aria-label="Close output panel"><X size={16} /></button>
      </div>
      {result ? (
        <div className="output-content">
          <div className="output-meta">
            <span className={result.status === "Accepted" ? "run-status-success" : "run-status"}>{result.status}</span>
            <span>{result.language}</span>
            {result.time && <span>{result.time}s</span>}
          </div>
          <pre>{result.output || (result.status === "Accepted" ? "Program finished with no output." : "No output was returned.")}</pre>
        </div>
      ) : (
        <div className="output-empty"><CircleHelp size={17} /><span>Run a program to see its output here.</span></div>
      )}
    </section>
  )
}

function EditorPage({ room, username, token, isDarkMode }) {
  const navigate = useNavigate()
  const ydoc = useMemo(() => new Y.Doc({ guid: room.id }), [room.id])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])
  const settings = useMemo(() => ydoc.getMap("settings"), [ydoc])
  const runState = useMemo(() => ydoc.getMap("run"), [ydoc])
  const color = useMemo(() => userColors[Math.floor(Math.random() * userColors.length)], [])
  const [provider, setProvider] = useState(null)
  const [editor, setEditor] = useState(null)
  const [users, setUsers] = useState([])
  const [language, setLanguage] = useState("javascript")
  const [connectionStatus, setConnectionStatus] = useState("connecting")
  const [connectionError, setConnectionError] = useState("")
  const [showCursors, setShowCursors] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const updateLanguage = () => {
      const currentLanguage = settings.get("language")
      if (languages.some((item) => item.value === currentLanguage)) setLanguage(currentLanguage)
    }
    const updateRun = () => {
      const result = runState.get("latest")
      setRunResult(result && typeof result === "object" ? result : null)
    }
    settings.observe(updateLanguage)
    runState.observe(updateRun)
    updateLanguage()
    updateRun()
    return () => {
      settings.unobserve(updateLanguage)
      runState.unobserve(updateRun)
    }
  }, [runState, settings])

  useEffect(() => {
    const nextProvider = new SocketIOProvider("/", room.id, ydoc, {
      autoConnect: true,
      auth: { token, clientId: ydoc.clientID }
    })
    setProvider(nextProvider)
    const setLocalUser = () => nextProvider.awareness.setLocalStateField("user", { username, color })
    nextProvider.on("synced", (synced) => {
      if (synced) setLocalUser()
    })
    setLocalUser()

    const updateUsers = () => {
      const states = Array.from(nextProvider.awareness.getStates().entries())
      setUsers(states
        .filter(([, state]) => typeof state.user?.username === "string")
        .map(([id, state]) => ({ id, ...state.user })))
    }
    const updateStatus = ({ status }) => {
      setConnectionStatus(status)
      if (status === "connected") setConnectionError("")
    }
    const handleConnectionError = (error) => {
      setConnectionError(error.message === "Unauthorized"
        ? "Your room session has expired. Join the room again to continue."
        : "The connection was interrupted. We will keep trying to reconnect.")
    }
    const initializeRoom = (synced) => {
      if (synced && !settings.has("language")) settings.set("language", "javascript")
    }
    const clearPresence = () => nextProvider.awareness.setLocalState(null)

    updateUsers()
    nextProvider.awareness.on("change", updateUsers)
    nextProvider.on("status", updateStatus)
    nextProvider.on("connection-error", handleConnectionError)
    nextProvider.on("synced", initializeRoom)
    window.addEventListener("beforeunload", clearPresence)
    window.addEventListener("pagehide", clearPresence)

    return () => {
      window.removeEventListener("beforeunload", clearPresence)
      window.removeEventListener("pagehide", clearPresence)
      nextProvider.awareness.setLocalState(null)
      nextProvider.awareness.off("change", updateUsers)
      nextProvider.off("status", updateStatus)
      nextProvider.off("connection-error", handleConnectionError)
      nextProvider.off("synced", initializeRoom)
      nextProvider.destroy()
    }
  }, [color, room.id, settings, token, username, ydoc])

  useEffect(() => {
    if (!editor || !provider) return undefined
    const model = editor.getModel()
    if (!model) return undefined
    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness)
    return () => binding.destroy()
  }, [editor, provider, yText])

  const handleCopyInvite = async () => {
    const succeeded = await copyText(`${window.location.origin}/room/${room.id}`)
    setCopied(succeeded)
    if (succeeded) window.setTimeout(() => setCopied(false), 1800)
  }

  const handleLeaveRoom = () => {
    sessionStorage.removeItem(`codetogether:room:${room.id}`)
    navigate("/rooms")
  }

  const changeLanguage = (event) => {
    settings.set("language", event.target.value)
  }

  const handleRun = async () => {
    const selectedLanguage = languages.find((item) => item.value === language)
    if (!selectedLanguage) return
    const runId = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    const code = yText.toString()
    setOutputOpen(true)
    setIsRunning(true)
    runState.set("latest", {
      id: runId,
      language: selectedLanguage.label,
      username,
      status: "Running",
      output: "",
      startedAt
    })

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ language: selectedLanguage.label, code })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The code could not be run.")
      runState.set("latest", { ...result, startedAt })
    } catch (error) {
      runState.set("latest", {
        id: runId,
        language: selectedLanguage.label,
        username,
        status: "Error",
        output: error.message || "The code could not be run. Please try again.",
        startedAt,
        finishedAt: new Date().toISOString()
      })
    } finally {
      setIsRunning(false)
    }
  }

  const visibleUsers = users.slice(0, 4)

  return (
    <main className="editor-page">
      <style>{remoteCursorStyles(users)}</style>
      <header className="editor-topbar">
        <Link className="brand editor-brand" to="/" aria-label="Code Together home">
          <span className="brand-mark"><Code2 size={18} /></span>
          <span>Code Together</span>
        </Link>
        <div className="room-heading">
          <span className="room-name">{room.name}</span>
          <span className="room-code">{room.id}</span>
        </div>
        <div className="editor-actions">
          <button type="button" className="toolbar-button copy-invite" onClick={handleCopyInvite} aria-label="Copy invite link">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Invite"}</span>
          </button>
          <div className="presence-wrap">
            <button type="button" className="presence-button" aria-expanded={usersOpen} aria-label={`${users.length} people in this room`} onClick={() => setUsersOpen((open) => !open)}>
              <span className="presence-avatars">
                {visibleUsers.map((user) => <span className="presence-avatar" key={user.id} style={{ "--avatar-color": validColor(user.color) }}>{initials(user.username)}</span>)}
              </span>
              <span className="presence-count"><UsersRound size={14} />{users.length}</span>
              <ChevronDown size={13} />
            </button>
            {usersOpen && (
              <div className="presence-popover" role="dialog" aria-label="People in this room">
                <div className="popover-heading"><strong>In this room</strong><button className="icon-button" type="button" aria-label="Close people list" onClick={() => setUsersOpen(false)}><X size={14} /></button></div>
                {users.length ? users.map((user) => (
                  <div className="presence-person" key={user.id}>
                    <span className="presence-avatar" style={{ "--avatar-color": validColor(user.color) }}>{initials(user.username)}</span>
                    <span>{user.username}{user.username === username ? " (you)" : ""}</span>
                    <span className="person-online" aria-label="Online" />
                  </div>
                )) : <p className="popover-empty">No one is connected yet.</p>}
              </div>
            )}
          </div>
          <label className="language-select">
            <span className="sr-only">Editor language</span>
            <select value={language} onChange={changeLanguage}>
              {languages.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
          <button type="button" className="run-button" onClick={handleRun} disabled={isRunning} aria-label={isRunning ? "Code is running" : "Run code"}>
            {isRunning ? <LoaderCircle size={14} className="run-spinner" /> : <Play size={14} fill="currentColor" />}
            {isRunning ? "Running" : "Run"}
          </button>
          <div className={`connection-indicator connection-${connectionStatus}`} role="status" aria-label={`Connection ${connectionStatus}`}>
            <span />
            <span className="connection-label">{connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting" : "Disconnected"}</span>
          </div>
          <button type="button" className="icon-button leave-button" onClick={handleLeaveRoom} aria-label="Leave room" title="Leave room"><LogOut size={15} /></button>
        </div>
      </header>

      <div className="editor-toolbar">
        <div className="editor-file"><span className="file-mark">{language === "javascript" ? "JS" : language.toUpperCase()}</span><span>main.{language === "javascript" ? "js" : language === "typescript" ? "ts" : language === "python" ? "py" : language === "cpp" ? "cpp" : language}</span></div>
        <div className="editor-toolbar-actions">
          <span className="editor-sync"><Wifi size={13} /> Changes sync automatically</span>
          <button type="button" className={`toolbar-button cursor-toggle ${showCursors ? "is-active" : ""}`} aria-pressed={showCursors} onClick={() => setShowCursors((shown) => !shown)}>
            {showCursors ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{showCursors ? "Hide cursors" : "Show cursors"}</span>
          </button>
          <button type="button" className={`toolbar-button output-toggle ${outputOpen ? "is-active" : ""}`} aria-expanded={outputOpen} onClick={() => setOutputOpen((open) => !open)}>
            <span>Output</span>{outputOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      <section className={`room-editor ${showCursors ? "" : "no-cursors"}`} aria-label="Collaborative code editor">
        <Editor
          height="100%"
          language={language}
          theme={isDarkMode ? "vs-dark" : "light"}
          defaultValue=""
          options={editorOptions}
          onMount={(mountedEditor) => setEditor(mountedEditor)}
          loading={<div className="editor-loading" role="status">Loading the editor...</div>}
        />
      </section>

      {connectionError && <div className="connection-error" role="alert">{connectionError}</div>}
      <OutputPanel isOpen={outputOpen} onClose={() => setOutputOpen(false)} result={runResult} />
    </main>
  )
}

export default EditorPage
