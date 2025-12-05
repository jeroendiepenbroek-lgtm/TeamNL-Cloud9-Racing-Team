# ============================================================================
# Railway Dockerfile - TeamNL Cloud9 Backend
# Single-stage, simple build - JUST WORKS
# ============================================================================

FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache curl dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALLE dependencies - gebruik npm ci voor reproduceerbare builds
# NODE_ENV moet NIET production zijn tijdens install, anders skipped hij devDeps
ENV NODE_ENV=development
RUN npm ci && \
    npm cache clean --force

# Verify critical packages
RUN npm list multer tsx @types/multer || (echo "ERROR: Missing critical packages" && exit 1)

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
