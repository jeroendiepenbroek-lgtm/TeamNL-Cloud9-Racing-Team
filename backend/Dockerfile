# ============================================================================
# Railway Dockerfile - DEFINITIVE (Dec 7, 2025)
# CLEAN BUILD - No cache issues
# ============================================================================

FROM node:22-alpine

# System dependencies + cleanup
RUN apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production && \
    npm cache clean --force

# Copy source (selective to avoid .git bloat)
COPY tsconfig.json ./
COPY src ./src

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
