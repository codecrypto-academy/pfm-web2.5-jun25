#!/bin/bash

# Build script for network-sdk that bundles everything needed

echo "🔧 Building network-sdk with bundled scripts..."

# Clean previous build
rm -rf dist

# Build TypeScript
echo "📦 Compiling TypeScript..."
if ! npx tsc; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Verify TypeScript output
if [[ ! -f "dist/index.js" ]]; then
    echo "❌ TypeScript compilation didn't produce expected output"
    echo "🔍 Checking what was generated:"
    find dist/ -name "*.js" 2>/dev/null || echo "No JavaScript files found"
    exit 1
fi

# Create directories for scripts
mkdir -p dist/scripts/{bash,config,lib}

# Copy shell scripts and key generation dependencies
echo "📋 Copying shell scripts and dependencies..."
cp ../scripts/besu-network.sh dist/scripts/
cp ../scripts/bash/* dist/scripts/bash/
cp ../scripts/config/* dist/scripts/config/
cp ../scripts/lib/* dist/scripts/lib/

# Copy key generation dependencies
cp ../scripts/createKeys.ts dist/scripts/
cp ../scripts/package.json dist/scripts/
cp ../scripts/tsconfig.json dist/scripts/

# Install dependencies for key generation
echo "📦 Installing dependencies for key generation..."
cd dist/scripts
yarn install --silent
yarn build --silent
cd ../..

# Make scripts executable
chmod +x dist/scripts/besu-network.sh
chmod +x dist/scripts/bash/*.sh

echo "✅ Build complete! Scripts bundled in dist/scripts/"
echo "📁 Directory structure:"
tree dist/ || ls -la dist/
