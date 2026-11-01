import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

function App() {
  const [provider, setProvider] = useState(null)
  const [editor, setEditor] = useState(null)
  const color = useMemo(() => {
    const colors = [ "#e11d48", "#2563eb", "#16a34a", "#d97706", "#9333ea", "#0891b2" ]
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  const [ username, setUsername ] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [ users, setUsers ] = useState([])

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ ydoc ])

  const handleMount = (ed) => setEditor(ed)

  const handleJoin = (e) => {
    e.preventDefault()
    setUsername(e.target.username.value)
    window.history.pushState({}, "", "?username=" + e.target.username.value)
  }

  useEffect(() => {
    if (!username) return
    const p = new SocketIOProvider("/", "monaco", ydoc, {
      autoConnect: true,
    })

    p.awareness.setLocalStateField("user", { username, color })

    const update = () => {
      const entries = Array.from(p.awareness.getStates().entries())
      setUsers(entries
        .filter(([ , s ]) => s.user && s.user.username)
        .map(([ id, s ]) => ({ id, ...s.user })))
    }
    update()
    p.awareness.on("change", update)
    setProvider(p)

    function handleBeforeUnload() {
      p.awareness.setLocalStateField("user", null)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      p.awareness.off("change", update)
      p.disconnect()
      setProvider(null)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [username, color, ydoc])

  useEffect(() => {
    if (!editor || !provider) return
    const binding = new MonacoBinding(
      yText, editor.getModel(), new Set([ editor ]), provider.awareness
    )
    return () => binding.destroy()
  }, [editor, provider, yText])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center" >
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="username"
          />
          <button
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <style>{users.map(u => {
        const name = u.username.replace(/[^\w ]/g, "")
        return `
          .yRemoteSelection-${u.id} { background: ${u.color}55; }
          .yRemoteSelectionHead-${u.id} { position: absolute; border-left: 2px solid ${u.color}; height: 100%; box-sizing: border-box; }
          .yRemoteSelectionHead-${u.id}::after { content: "${name}"; position: absolute; top: -1.4em; left: -2px; background: ${u.color}; color: #fff; font-size: 11px; padding: 0 4px; border-radius: 3px; white-space: nowrap; }
        `
      }).join("")}</style>

      <aside className="h-full w-1/4 bg-amber-50 rounded-lg">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">Users</h2>
        <ul className="p-4">
          {users.map((user) => (
            <li key={user.id} className="p-2 bg-gray-800 text-white rounded mb-2 flex items-center">
              <span style={{ background: user.color }} className="inline-block w-3 h-3 rounded-full mr-2" />
              {user.username}
            </li>
          ))}
        </ul>
      </aside>

      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  )
}

export default App