# Railway Dockerfile - TeamNL Cloud9 Backend
# Build backend + frontend, deploy backend server

FROM node:22-alpine AS base
WORKDIR /app

# === FRONTEND BUILD ===
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY backend/frontend/package*.json ./
RUN npm ci
COPY backend/frontend/ ./
RUN npm run build

# === BACKEND BUILD ===
FROM base AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
# Copy frontend build
RUN mkdir -p public/dist
COPY --from=frontend-builder /app/frontend/dist/ ./public/dist/

# === PRODUCTION ===
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy backend with frontend build
COPY --from=backend-builder /app/backend /app

# Expose port
EXPOSE 3000

# Start server
CMD ["npx", "tsx", "src/server.ts"]
