# ============================================================================
# Railway Dockerfile - TeamNL Cloud9 Backend v3.0
# ============================================================================
# Minimal backend: Health endpoints + frontend serving
# Build: Backend dependencies + frontend Vite build
# Run: tsx server.ts (development mode for fast iteration)
# ============================================================================

FROM node:22-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci

# Copy backend source
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Move frontend build to backend public directory
RUN mkdir -p /app/public/dist && \
    cp -r dist/* /app/public/dist/

# Return to backend directory
WORKDIR /app

# Environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server with tsx (TypeScript execution)
CMD ["npm", "start"]
