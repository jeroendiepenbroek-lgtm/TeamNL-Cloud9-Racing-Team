# ============================================================================
# Railway Dockerfile - DEFINITIVE FIX
# ROOT CAUSE: multer 2.0.2 failed to install in Alpine Linux
# SOLUTION: Use multer 1.4.5-lts.1 (stable)
# ============================================================================

FROM node:22-alpine

# System dependencies
RUN apk add --no-cache curl dumb-init

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Verify critical packages
RUN echo "=== Package verification ===" && \
    npm list multer && \
    npm list tsx && \
    echo "=== All packages OK ==="

# Copy source
COPY . .

# Runtime config
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/server.ts"]
