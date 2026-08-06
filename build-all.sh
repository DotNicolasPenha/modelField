#!/bin/bash

echo "Building ModelField for all platforms..."

# Linux
echo ""
echo "=== Building for Linux (amd64) ==="
wails build GOOS=linux GOARCH=amd64

# Windows
echo ""
echo "=== Building for Windows (amd64) ==="
wails build GOOS=windows GOARCH=amd64

# macOS
echo ""
echo "=== Building for macOS (arm64) ==="
wails build GOOS=darwin GOARCH=arm64

echo ""
echo "=== Build complete ==="
echo "Check ./build/bin/ for binaries"
