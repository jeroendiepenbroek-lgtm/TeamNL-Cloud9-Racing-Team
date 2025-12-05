# ============================================================================
# Railway Dockerfile - TeamNL Cloud9 Backend
# Single-stage, simple build - PERMANENT FIX
# BUILD: 2025-12-05-v3 (cache buster)
# ============================================================================

FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache curl dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# CRITICAL FIX: Install ALL dependencies including devDeps
# Railway cached the old broken build - this forces fresh install
ENV NODE_ENV=development
RUN rm -rf node_modules package-lock.json && \
    npm install && \
    npm cache clean --force

# Validate packages are actually installed
RUN npm list multer tsx @types/multer 2>&1 | tee /tmp/packages.log && \
    (npm list multer || exit 1) && \
    (npm list tsx || exit 1)

# Copy source code
COPY . .

# NOW set to production (after npm ci is done)
ENV NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start server with npx tsx (same as npm start)
CMD ["npx", "tsx", "src/server.ts"]
