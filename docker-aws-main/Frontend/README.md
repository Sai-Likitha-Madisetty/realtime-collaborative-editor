# Collab Code Editor

A real-time collaborative code editor where multiple users can edit the same file simultaneously. Changes sync instantly across all connected users, with conflict-free merging powered by Yjs (CRDT).

## Features
- Real-time multi-user editing with Monaco Editor (the VS Code editor)
- Conflict-free sync using Yjs and WebSockets (Socket.io)
- Live remote cursors with user colors and name badges
- Online users list
- Dockerized with a multi-stage build
- Deployed on AWS

## Tech Stack
React, Vite, Tailwind CSS, Monaco Editor, Yjs, Node.js, Express, Socket.io, Docker, AWS

## Credits
Based on a tutorial by Ankur (github.com/ankurdotio/docker-aws), extended with my own features.
