# ------------------------------------------
# STAGE 1: Build Frontend
# ------------------------------------------
FROM node:22-alpine AS frontend-builder

# Force rebuild - 2025-12-25-US1-US2-US3
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# ------------------------------------------
# STAGE 2: Setup Backend
# ------------------------------------------
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy backend source
COPY backend/ ./

# ------------------------------------------
# STAGE 3: Production Runtime
# ------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start server
CMD ["npm", "start"]
