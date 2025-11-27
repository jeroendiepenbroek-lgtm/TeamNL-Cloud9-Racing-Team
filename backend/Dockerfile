# Multi-stage build for TeamNL Cloud9 Backend
# Context: /backend directory (Railway Root Directory)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --production=false
RUN cd frontend && npm install

# Copy ALL source code (including data directory)
COPY . .

# Verify data directory exists
RUN ls -la data/ || echo "⚠️  Warning: data directory not found"

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built assets and source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

# Copy data directory (API documentation)
COPY --from=builder /app/data ./data

# Verify data files exist
RUN ls -lah data/ || echo "⚠️  Warning: data directory not copied"

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["npx", "tsx", "src/server.ts"]
