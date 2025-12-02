# Railway Dockerfile - TeamNL Cloud9 Backend
# Build backend + frontend, serve as single deployment

FROM node:22-alpine AS base

# === FRONTEND BUILD ===
FROM base AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ ./
# Build frontend (outputs to ../public/dist relative to frontend dir)
# Since we're in /frontend, it will write to /public/dist
# Override to write to /frontend-dist instead
RUN npm run build -- --outDir /frontend-dist

# === BACKEND RUNTIME ===
FROM base AS final
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --production=false

# Copy backend source code
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Create public directory and copy frontend build
RUN mkdir -p public/dist
COPY --from=frontend-builder /frontend-dist/ ./public/dist/

# Copy Railway startup script
COPY ../start.sh ./start.sh
RUN chmod +x ./start.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Expose port (Railway overrides with $PORT)
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with debug script
CMD ["./start.sh"]
