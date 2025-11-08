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

# Install backend dependencies (include tsx for runtime!)
COPY backend/package*.json ./
RUN npm ci

# Copy backend code
COPY backend/src ./src

# Copy frontend build to public/dist (matches vite.config.ts outDir)
RUN mkdir -p public/dist
COPY --from=frontend-builder /frontend-dist/ ./public/dist/

# Copy legacy firebase static assets
RUN mkdir -p frontend/public/legacy
COPY backend/frontend/public/legacy/ ./frontend/public/legacy/

# Environment
ENV NODE_ENV=production
# Railway sets PORT dynamically, but fallback to 3000
ENV PORT=3000

# Expose port
EXPOSE 3000

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server with debug script
CMD ["/app/start.sh"]
