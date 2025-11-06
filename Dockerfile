# Railway Dockerfile - TeamNL Cloud9 Backend
# Build backend + frontend, deploy backend server

FROM node:22-alpine AS base

# === FRONTEND BUILD ===
FROM base AS frontend-builder
WORKDIR /build
COPY backend/frontend/package*.json ./
RUN npm ci
COPY backend/frontend/ ./
# Vite builds to ../public/dist (relative to frontend/)
# But we're in /build, so it will fail. Let's override:
RUN npm run build -- --outDir=/frontend-dist

# === BACKEND RUNTIME ===
FROM base AS final
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY backend/src ./src

# Create public/dist and copy frontend build
RUN mkdir -p public/dist
COPY --from=frontend-builder /frontend-dist/ ./public/dist/

# Environment
ENV NODE_ENV=production
EXPOSE 3000

# Start server
CMD ["npx", "tsx", "src/server.ts"]
