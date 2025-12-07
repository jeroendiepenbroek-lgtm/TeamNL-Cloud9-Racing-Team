# ============================================================================
# Railway Dockerfile - ROOT CONTEXT (Dec 7, 2025)
# DEFINITIVE: Works with Railway's root context behavior
# ============================================================================

FROM node:22-alpine

# System dependencies
RUN apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy backend files
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    echo "✅ Dependencies installed"

# Copy source
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Runtime config
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/server.ts"]
