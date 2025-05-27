# Production Dockerfile with comprehensive error handling and environment variable injection
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with verbose logging
RUN npm ci --verbose --no-optional

# Copy source code
COPY . .

# CRITICAL: Set build-time environment variables
# These must be passed as build args and set as ENV vars for Vite to pick them up
ARG NODE_ENV=production
ARG VITE_API_URL
ARG VITE_PLAID_ENV
ARG VITE_GOOGLE_CLIENT_ID

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PLAID_ENV=$VITE_PLAID_ENV
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Print environment variables for debugging (don't include secrets)
RUN echo "🔍 Build Environment Check:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "VITE_API_URL: $VITE_API_URL" && \
    echo "VITE_PLAID_ENV: $VITE_PLAID_ENV" && \
    echo "Build started at: $(date)"

# Enable strict error handling and verbose output
RUN set -euo pipefail && \
    echo "🔨 Starting Vite frontend build..." && \
    npm run build:frontend || (echo "❌ Vite build failed" && exit 1) && \
    echo "✅ Vite build completed successfully" && \
    echo "🔨 Starting server build..." && \
    npm run build:server || (echo "❌ Server build failed" && exit 1) && \
    echo "✅ Server build completed successfully"

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --verbose

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "dist/index.js"]