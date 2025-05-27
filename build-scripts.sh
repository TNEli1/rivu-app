#!/bin/bash
# Comprehensive build script with error handling and environment variable injection
set -euo pipefail

echo "🔨 Starting comprehensive build process..."

# Function to check and set environment variables
check_env_vars() {
    echo "🔍 Checking environment variables..."
    
    # Print non-sensitive environment variables
    echo "NODE_ENV: ${NODE_ENV:-not-set}"
    echo "VITE_API_URL: ${VITE_API_URL:-not-set}"
    echo "VITE_PLAID_ENV: ${VITE_PLAID_ENV:-not-set}"
    
    # Set defaults for missing variables
    if [ -z "${VITE_API_URL:-}" ]; then
        echo "⚠️  Setting default VITE_API_URL"
        export VITE_API_URL="https://www.tryrivu.com"
    fi
    
    if [ -z "${VITE_PLAID_ENV:-}" ]; then
        echo "⚠️  Setting default VITE_PLAID_ENV"
        export VITE_PLAID_ENV="production"
    fi
    
    if [ -z "${NODE_ENV:-}" ]; then
        echo "⚠️  Setting default NODE_ENV"
        export NODE_ENV="production"
    fi
}

# Function to build frontend
build_frontend() {
    echo "🚀 Building frontend with Vite..."
    
    # Enable verbose Vite logging
    npx vite build --mode production --logLevel info || {
        echo "❌ Vite build failed"
        echo "📋 Vite build logs:"
        cat vite.log 2>/dev/null || echo "No Vite logs found"
        exit 1
    }
    
    echo "✅ Frontend build completed"
    echo "📁 Frontend build output:"
    ls -la dist/public 2>/dev/null || echo "No dist/public directory found"
}

# Function to build server
build_server() {
    echo "🚀 Building server with esbuild..."
    
    npx esbuild server/index.ts \
        --platform=node \
        --packages=external \
        --bundle \
        --format=esm \
        --outdir=dist \
        --log-level=info \
        --sourcemap || {
        echo "❌ Server build failed"
        exit 1
    }
    
    echo "✅ Server build completed"
    echo "📁 Server build output:"
    ls -la dist/ 2>/dev/null || echo "No dist directory found"
}

# Main execution
main() {
    echo "🔨 Starting production build process..."
    echo "📅 Build started at: $(date)"
    
    # Check environment variables
    check_env_vars
    
    # Build frontend
    build_frontend
    
    # Build server
    build_server
    
    echo "✅ Build process completed successfully!"
    echo "📅 Build finished at: $(date)"
    
    # Verify build outputs
    echo "🔍 Verifying build outputs..."
    if [ -f "dist/index.js" ] && [ -d "dist/public" ]; then
        echo "✅ All build artifacts present"
    else
        echo "❌ Missing build artifacts"
        echo "dist/index.js exists: $([ -f "dist/index.js" ] && echo "Yes" || echo "No")"
        echo "dist/public exists: $([ -d "dist/public" ] && echo "Yes" || echo "No")"
        exit 1
    fi
}

# Run main function
main "$@"