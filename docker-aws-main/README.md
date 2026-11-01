# Code Together

Code Together is a shared online editor for writing, learning, and solving problems with someone else. Create a room, share its link, and start working in the same file.

## Features

- Live collaborative editing with Monaco and Yjs
- Live participant list and optional remote cursors
- Shared JavaScript, TypeScript, Python, C++, Java, and Go execution through Judge0 CE
- Private rooms protected by an optional password
- Six-character room codes and invite links
- Room metadata and Yjs documents persisted on the server
- Responsive landing page and editor, with a mobile output sheet
- One-port production deployment with Docker

## Technology

- React 19, Vite, Tailwind CSS v4, Monaco Editor, Yjs, and y-monaco
- Node.js, Express 5, Socket.IO, and y-socket.io
- Docker and AWS

## Local setup

Use Node.js 20 or newer. In the first terminal, start from the project root and set up the backend:

```powershell
cd Backend
npm install
npm run dev
```

The first `npm run dev` creates a private, random `JWT_SECRET` in the ignored `Backend/.env` file when one is not already set. To configure it yourself instead, copy `.env.example` to `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters. Generate a value with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value private. Leave this terminal in `Backend` for the backend start command below. In a second terminal, start from the project root and install the frontend:

```powershell
cd Frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Vite proxies `/api` and `/socket.io` to the backend on port 3000. For a production-style local run, build the frontend and start the backend with the built files copied to `Backend/public`.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | Yes | — | Private signing key for room tokens. Use a random value of at least 32 characters. |
| `JUDGE0_URL` | No | `https://ce.judge0.com` | Base URL for the Judge0 CE service. |
| `PORT` | No | `3000` | HTTP and Socket.IO server port. |
| `FRONTEND_ORIGIN` | No | `*` | Allowed Socket.IO browser origin. Set this to the deployed frontend origin when needed. |

The backend loads `Backend/.env` for local development. `.env` and `Backend/data` are ignored by Git.

## Docker

Build the production image from the project root:

```powershell
docker build -t code-together .
```

Create `Backend/.env` as described above, then run the app with a named volume so room metadata and Yjs documents survive container restarts:

```powershell
docker run --env-file Backend/.env -p 3000:3000 -v code-together-data:/app/data code-together
```

Open `http://localhost:3000`. The `/app/data` volume contains `rooms.json` and the Yjs LevelDB persistence directory. Back up this volume to preserve rooms and their contents. Do not start the production container without setting `JWT_SECRET`.

## Architecture

The Express server creates and persists room metadata, hashes optional passwords with bcryptjs, and issues short-lived JWTs when a room is created or joined. The browser keeps the token for that room in session storage. The Socket.IO provider sends it in the connection `auth` payload. Yjs socket middleware verifies the token and checks that its `roomId` matches the requested `/yjs|<roomId>` namespace before allowing document synchronization.

Each room has one Yjs document. Its `monaco` text is bound to the Monaco model; the `settings` map synchronizes the selected language; and the `run` map shares the latest Judge0 result with everyone in the room. Express exposes the authenticated `/api/run` endpoint, looks up the current Judge0 language IDs, submits code, polls for completion, and returns output for storage in that shared map. In production, Express also serves the built React app and falls back to `index.html` for client-side routes such as `/room/:roomId`.

## Added dependencies

- Backend: `bcryptjs`, `dotenv`, `express-rate-limit`, `jsonwebtoken`, and `y-protocols`
- Frontend: `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`, `lucide-react`, and `react-router-dom`

## Attribution

The original editor was based on a tutorial by Ankur at [ankurdotio/docker-aws](https://github.com/ankurdotio/docker-aws). The landing page footer currently links to the repository owner's GitHub and the general LinkedIn site; replace the LinkedIn destination with a personal profile URL before publishing.
