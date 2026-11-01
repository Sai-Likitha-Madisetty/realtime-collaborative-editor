import "./App.css"
import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ArrowUpRight,
  Code2,
  Link2,
  LockKeyhole,
  MousePointer2,
  Play,
  UsersRound,
  Wifi
} from "lucide-react"
import { copyText } from "./clipboard.js"

const EditorPage = lazy(() => import("./EditorPage.jsx"))

const githubUrl = "https://github.com/Sai-Likitha-Madisetty/collab-code-editor"
const demoCode = `function welcome(name) {\n  return \`Hello, \${name}!\`\n}\n\nconst team = ["Maya", "Jordan"]\nteam.forEach((name) => {\n  console.log(welcome(name))\n})`

function Header({ isDarkMode, setIsDarkMode }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Code Together home">
        <span className="brand-mark"><Code2 size={19} strokeWidth={2.2} /></span>
        <span>Code Together</span>
      </Link>

      <nav className="header-actions" aria-label="Main navigation">
        {/* 1. GitHub Link */}
        <a className="header-link" href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>

        {/* 2. Open Editor Button */}
        <Link className="button button-small button-muted ml-2" to="/rooms">Open editor</Link>

        {/* 3. Sun / Moon Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setIsDarkMode((dark) => !dark)}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={!isDarkMode}
          className="theme-toggle"
        >
          {/* Sun Icon (Light Mode) */}
          <svg
            className={`w-4 h-4 text-amber-400 transition-transform duration-500 transform ${
              isDarkMode ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100 relative"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>

          {/* Moon Icon (Dark Mode) */}
          <svg
            className={`w-4 h-4 text-cyan-400 transition-transform duration-500 transform ${
              isDarkMode ? "rotate-0 scale-100 relative" : "-rotate-90 scale-0 absolute"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </button>
      </nav>
    </header>
  )
}

function EditorPreview() {
  const [charactersShown, setCharactersShown] = useState(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      setCharactersShown(demoCode.length)
      return undefined
    }

    let position = 0
    let timer
    const typeNextCharacter = () => {
      if (position >= demoCode.length) {
        timer = window.setTimeout(() => {
          position = 0
          setCharactersShown(0)
          typeNextCharacter()
        }, 2000)
        return
      }

      position += 1
      setCharactersShown(position)
      timer = window.setTimeout(typeNextCharacter, 36)
    }

    timer = window.setTimeout(typeNextCharacter, 36)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const visibleCode = demoCode.slice(0, charactersShown)

  return (
    <div className="preview-shell" aria-label="A preview of two people editing code together">
      <div className="preview-toolbar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="preview-file"><span className="file-mark">JS</span> welcome.js</div>
        <div className="online-indicator"><span />2 online</div>
      </div>
      <div className="preview-editor">
        <div className="preview-gutter" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <span key={index}>{index + 1}</span>)}
        </div>
        <pre className="preview-code" aria-hidden="true">{visibleCode}<span className="demo-caret" /></pre>
        <div className="demo-cursor demo-cursor-maya" aria-hidden="true">
          <MousePointer2 size={13} fill="currentColor" />
          <span>Maya</span>
        </div>
        <div className="demo-cursor demo-cursor-jordan" aria-hidden="true">
          <MousePointer2 size={13} fill="currentColor" />
          <span>Jordan</span>
        </div>
      </div>
      <div className="preview-status"><span><Wifi size={13} /> Everyone is up to date</span><span>JavaScript</span></div>
    </div>
  )
}

function FeatureGrid() {
  return (
    <section className="features-section" aria-labelledby="features-title">
      <div className="section-heading">
        <p className="section-kicker">Made for working together</p>
        <h2 id="features-title">Everything you need to build as a team.</h2>
      </div>
      <div className="feature-grid">
        <article className="feature feature-primary">
          <div className="feature-icon"><UsersRound size={19} /></div>
          <h3>Work in the same file</h3>
          <p>Changes show up as they happen, so everyone stays in the flow.</p>
          <div className="feature-people" aria-label="Maya and Jordan are editing">
            <span className="avatar avatar-maya">M</span><span className="avatar avatar-jordan">J</span>
            <span>Editing together</span>
          </div>
        </article>
        <article className="feature">
          <div className="feature-icon"><MousePointer2 size={19} /></div>
          <h3>See who is here</h3>
          <p>Know who is in the room and where they are working.</p>
        </article>
        <article className="feature feature-run">
          <div className="feature-icon"><Play size={18} /></div>
          <h3>Try it together</h3>
          <p>Run JavaScript, TypeScript, Python, C++, Java, or Go. Everyone sees the result.</p>
          <div className="language-list">JS <span /> TS <span /> PY <span /> C++ <span /> JAVA <span /> GO</div>
        </article>
        <article className="feature">
          <div className="feature-icon"><LockKeyhole size={19} /></div>
          <h3>Keep a room private</h3>
          <p>Add a password when you want to limit who can join.</p>
        </article>
        <article className="feature feature-link">
          <div className="feature-icon"><Link2 size={19} /></div>
          <h3>Invite with a link</h3>
          <p>Share one room link with anyone you want to work with.</p>
          <div className="invite-chip">codetogether.app/room/8KQ2MX</div>
        </article>
        <article className="feature">
          <div className="feature-icon"><Code2 size={19} /></div>
          <h3>Pick up where you left off</h3>
          <p>Your room and its work are saved automatically.</p>
        </article>
      </div>
    </section>
  )
}

function HomePage({ isDarkMode, setIsDarkMode }) {
  return (
    <div className={`page-shell ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="hero-kicker"><span className="kicker-line" /> A shared space for your next idea</p>
            <h1>Write code together, <span>at the same time.</span></h1>
            <p className="hero-description">A simple place to build, learn, and solve problems with someone else — wherever they are.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/rooms">Create a room</Link>
              <Link className="button button-outline" to="/rooms?mode=join">Join a room</Link>
            </div>
            <div className="hero-note"><span className="note-dot" /> No setup. Just share a link and start.</div>
          </div>
          <div className="hero-visual"><EditorPreview /></div>
        </section>

        <section className="plain-language-section">
          <div className="plain-language-rule" />
          <div>
            <h2>Like Google Docs, but for code.</h2>
            <p>Open a room and make something together. No installs or complicated setup.</p>
          </div>
          <Link className="text-link" to="/rooms">Get started <ArrowUpRight size={16} /></Link>
        </section>

        <FeatureGrid />

        <section className="steps-section" aria-labelledby="steps-title">
          <div className="section-heading">
            <p className="section-kicker">Up and running in a moment</p>
            <h2 id="steps-title">Three steps. Then you are building.</h2>
          </div>
          <ol className="steps-list">
            <li><span className="step-number">01</span><div><h3>Create a room</h3><p>Choose your name and start a shared space.</p></div></li>
            <li><span className="step-number">02</span><div><h3>Share the link</h3><p>Invite a friend, classmate, or teammate.</p></div></li>
            <li><span className="step-number">03</span><div><h3>Code together</h3><p>Write, run, and learn in real time.</p></div></li>
          </ol>
        </section>

        <section className="built-section" aria-labelledby="built-title">
          <h2 id="built-title">Built with tools teams trust.</h2>
          <div className="built-list"><span>React</span><span>Node.js</span><span>WebSockets</span><span>Yjs</span><span>Docker</span><span>AWS</span></div>
        </section>
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/"><span className="brand-mark"><Code2 size={18} /></span><span>Code Together</span></Link>
        <span className="footer-credit">Made by Sai Likitha Madisetty</span>
        <div className="footer-links">
          <a href="https://www.linkedin.com/in/sai-likitha-madisetty/" target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  )
}

function saveRoomSession(room, username, token) {
  sessionStorage.setItem(`codetogether:room:${room.id}`, JSON.stringify({
    room,
    username,
    token
  }))
}

function RoomFlow({ initialRoomCode = "" }) {
  const location = useLocation()
  const navigate = useNavigate()
  const query = new URLSearchParams(location.search)
  const roomCodePrefill = initialRoomCode || query.get("code") || ""
  const [activeTab, setActiveTab] = useState(roomCodePrefill || query.get("mode") === "join" ? "join" : "create")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [createdRoom, setCreatedRoom] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") || "").trim()
    const payload = {
      username,
      name: String(form.get("roomName") || "").trim(),
      password: String(form.get("password") || "")
    }
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not create the room.")
      saveRoomSession(result.room, username, result.token)
      setCreatedRoom({ ...result.room, username })
    } catch (requestError) {
      setError(requestError.message || "Could not connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") || "").trim()
    const roomCode = String(form.get("roomCode") || "").trim().toUpperCase()
    const password = String(form.get("password") || "")
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.passwordRequired) setPasswordRequired(true)
        throw new Error(result.error || "Could not join the room.")
      }
      saveRoomSession(result.room, username, result.token)
      navigate(`/room/${result.room.id}`)
    } catch (requestError) {
      setError(requestError.message || "Could not connect to the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyInvite() {
    const inviteUrl = `${window.location.origin}/room/${createdRoom.id}`
    const result = await copyText(inviteUrl)
    setCopied(result)
    if (result) window.setTimeout(() => setCopied(false), 1800)
  }

  if (createdRoom) {
    const inviteUrl = `${window.location.origin}/room/${createdRoom.id}`
    return (
      <main className="room-flow-shell">
        <Link className="brand" to="/"><span className="brand-mark"><Code2 size={19} /></span><span>Code Together</span></Link>
        <section className="flow-panel success-panel">
          <div className="success-icon"><Code2 size={20} /></div>
          <p className="section-kicker">Your room is ready</p>
          <h1>Share it and get started.</h1>
          <p className="flow-subtitle">Send this link to anyone you want to code with.</p>
          <div className="room-code-block">
            <span>Room code</span>
            <strong>{createdRoom.id}</strong>
          </div>
          <div className="invite-copy-row">
            <input aria-label="Room invite link" value={inviteUrl} readOnly />
            <button type="button" className="button button-muted" onClick={handleCopyInvite}>{copied ? "Copied" : "Copy link"}</button>
          </div>
          <button type="button" className="button button-primary flow-submit" onClick={() => navigate(`/room/${createdRoom.id}`)}>Open room</button>
        </section>
      </main>
    )
  }

  return (
    <main className="room-flow-shell">
      <Link className="brand" to="/"><span className="brand-mark"><Code2 size={19} /></span><span>Code Together</span></Link>
      <section className="flow-panel">
        <Link className="back-link" to="/">Back to home</Link>
        <h1>Start with a room.</h1>
        <p className="flow-subtitle">Create a new space or join someone else's.</p>
        <div className="flow-tabs" role="tablist" aria-label="Choose room action">
          <button
            type="button"
            role="tab"
            id="create-room-tab"
            data-room-tab="create"
            aria-controls="room-flow-panel"
            aria-selected={activeTab === "create"}
            tabIndex={activeTab === "create" ? 0 : -1}
            className={activeTab === "create" ? "active" : ""}
            onClick={() => { setActiveTab("create"); setError("") }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
              event.preventDefault()
              const nextTab = event.key === "Home" ? "create" : event.key === "End" ? "join" : activeTab === "create" ? "join" : "create"
              setActiveTab(nextTab)
              event.currentTarget.parentElement.querySelector(`[data-room-tab="${nextTab}"]`).focus()
            }}
          >Create room</button>
          <button
            type="button"
            role="tab"
            id="join-room-tab"
            data-room-tab="join"
            aria-controls="room-flow-panel"
            aria-selected={activeTab === "join"}
            tabIndex={activeTab === "join" ? 0 : -1}
            className={activeTab === "join" ? "active" : ""}
            onClick={() => { setActiveTab("join"); setError("") }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
              event.preventDefault()
              const nextTab = event.key === "Home" ? "create" : event.key === "End" ? "join" : activeTab === "create" ? "join" : "create"
              setActiveTab(nextTab)
              event.currentTarget.parentElement.querySelector(`[data-room-tab="${nextTab}"]`).focus()
            }}
          >Join a room</button>
        </div>
        {activeTab === "create" ? (
          <div className="flow-tabpanel" id="room-flow-panel" role="tabpanel" aria-labelledby="create-room-tab" tabIndex={0}>
          <form className="flow-form" onSubmit={handleCreate}>
            <label htmlFor="create-username">Your name</label>
            <input id="create-username" name="username" placeholder="How should others know you?" autoComplete="name" maxLength={40} required />
            <label htmlFor="room-name">Room name <span>Optional</span></label>
            <input id="room-name" name="roomName" placeholder="e.g. Friday project" maxLength={80} />
            <label htmlFor="create-password">Room password <span>Optional</span></label>
            <input id="create-password" name="password" type="password" placeholder="Add one for a private room" autoComplete="new-password" maxLength={128} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary flow-submit" type="submit" disabled={loading}>{loading ? "Creating room..." : "Create room"}</button>
          </form>
          </div>
        ) : (
          <div className="flow-tabpanel" id="room-flow-panel" role="tabpanel" aria-labelledby="join-room-tab" tabIndex={0}>
          <form className="flow-form" onSubmit={handleJoin}>
            <label htmlFor="join-username">Your name</label>
            <input id="join-username" name="username" placeholder="How should others know you?" autoComplete="name" maxLength={40} required />
            <label htmlFor="room-code">Room code</label>
            <input id="room-code" name="roomCode" placeholder="6-character code" defaultValue={roomCodePrefill} autoCapitalize="characters" autoComplete="off" maxLength={6} required onChange={() => { setPasswordRequired(false); setError("") }} />
            {passwordRequired && (
              <>
                <label htmlFor="join-password">Room password</label>
                <input id="join-password" name="password" type="password" placeholder="Enter the room password" autoComplete="current-password" maxLength={128} autoFocus />
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary flow-submit" type="submit" disabled={loading}>{loading ? "Joining room..." : "Join room"}</button>
          </form>
          </div>
        )}
      </section>
    </main>
  )
}

function ComingSoon({ title }) {
  return (
    <main className="route-placeholder">
      <Link className="brand" to="/"><span className="brand-mark"><Code2 size={19} /></span><span>Code Together</span></Link>
      <div className="placeholder-panel"><p className="section-kicker">Code Together</p><h1>{title}</h1><p>This part of the room experience is coming next.</p><Link className="button button-primary" to="/">Back to home</Link></div>
    </main>
  )
}

function RoomRoute({ isDarkMode }) {
  const { roomId = "" } = useParams()
  const location = useLocation()
  const [roomState, setRoomState] = useState({ status: "loading", session: null })

  useEffect(() => {
    let active = true
    async function verifySession() {
      let saved
      try {
        saved = JSON.parse(sessionStorage.getItem(`codetogether:room:${roomId}`) || "null")
      } catch {
        sessionStorage.removeItem(`codetogether:room:${roomId}`)
      }
      if (!saved?.token || !saved?.username) {
        if (active) setRoomState({ status: "join", session: null })
        return
      }

      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
          headers: { authorization: `Bearer ${saved.token}` }
        })
        if (!response.ok) {
          sessionStorage.removeItem(`codetogether:room:${roomId}`)
          if (active) setRoomState({ status: "join", session: null })
          return
        }
        const { room } = await response.json()
        if (active) setRoomState({ status: "ready", session: { ...saved, room } })
      } catch {
        if (active) setRoomState({ status: "error", session: null })
      }
    }
    verifySession()
    return () => { active = false }
  }, [location.key, roomId])

  if (roomState.status === "loading") {
    return <main className="route-loading" role="status">Opening your room...</main>
  }
  if (roomState.status === "join") return <RoomFlow initialRoomCode={roomId} />
  if (roomState.status === "error") {
    return (
      <main className="route-placeholder">
        <div className="placeholder-panel"><h1>Room unavailable</h1><p>We could not reach the server. Check your connection and try again.</p><Link className="button button-outline" to={`/rooms?mode=join&code=${encodeURIComponent(roomId)}`}>Join this room</Link></div>
      </main>
    )
  }

  return (
    <Suspense fallback={<main className="route-loading" role="status">Loading the editor...</main>}>
      <EditorPage room={roomState.session.room} username={roomState.session.username} token={roomState.session.token} isDarkMode={isDarkMode} />
    </Suspense>
  )
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => window.localStorage.getItem("codetogether:theme") !== "light")

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light"
    window.localStorage.setItem("codetogether:theme", isDarkMode ? "dark" : "light")
  }, [isDarkMode])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
        <Route path="/rooms" element={<RoomFlow />} />
        <Route path="/room/:roomId" element={<RoomRoute isDarkMode={isDarkMode} />} />
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App