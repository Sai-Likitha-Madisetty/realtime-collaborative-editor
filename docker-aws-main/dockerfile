FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-builder

WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY Backend/package*.json ./
RUN npm ci --omit=dev
COPY Backend/ ./

FROM node:20-alpine

WORKDIR /app
COPY --from=backend-builder /app ./
COPY --from=frontend-builder /app/dist ./public
RUN mkdir -p /app/data

ENV PORT=3000
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server.js"]
