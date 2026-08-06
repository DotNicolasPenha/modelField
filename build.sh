#!/bin/bash

set -e

# Ensure wails is in PATH
export PATH=$PATH:$(go env GOPATH)/bin

VERSION="${1:-dev}"
OUTPUT_DIR="build/bin"
APP_NAME="ModelField"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       ModelField Build Script        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected: $OS $ARCH"
echo ""

# ── Helpers ──────────────────────────────────────────────

check_cmd() {
    command -v "$1" >/dev/null 2>&1
}

install_if_missing() {
    local cmd="$1"
    local pkg="$2"
    if ! check_cmd "$cmd"; then
        echo "Installing $pkg..."
        if check_cmd apt-get; then
            sudo apt-get update -qq && sudo apt-get install -y -qq "$pkg"
        elif check_cmd dnf; then
            sudo dnf install -y "$pkg"
        elif check_cmd pacman; then
            sudo pacman -S --noconfirm "$pkg"
        elif check_cmd brew; then
            brew install "$pkg"
        else
            echo "ERROR: Cannot install $pkg automatically."
            echo "Please install manually and re-run this script."
            exit 1
        fi
    fi
}

# ── Linux Build ──────────────────────────────────────────

build_linux() {
    echo "=== Building for Linux (amd64) ==="
    echo ""

    # Check and install dependencies
    echo "Checking dependencies..."

    if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
        echo "  webkit2gtk-4.1: OK"
        # Wails v2 looks for webkit2gtk-4.0 — create symlink if missing
        if ! pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
            PKG_DIR=$(pkg-config --variable=pcfiledir webkit2gtk-4.1)
            if [ -w "$PKG_DIR" ] 2>/dev/null; then
                ln -sf "$PKG_DIR/webkit2gtk-4.1.pc" "$PKG_DIR/webkit2gtk-4.0.pc"
                echo "  webkit2gtk-4.0 symlink: OK"
            else
                echo "  Creating webkit2gtk-4.0 compatibility symlink (sudo)..."
                sudo ln -sf "$PKG_DIR/webkit2gtk-4.1.pc" "$PKG_DIR/webkit2gtk-4.0.pc" 2>/dev/null \
                    || { echo "ERROR: Need sudo to create symlink. Run manually:"; \
                         echo "  sudo ln -sf $PKG_DIR/webkit2gtk-4.1.pc $PKG_DIR/webkit2gtk-4.0.pc"; exit 1; }
                echo "  webkit2gtk-4.0 symlink: OK"
            fi
        fi
    elif pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
        echo "  webkit2gtk-4.0: OK"
    else
        echo "webkit2gtk not found. Installing..."
        sudo apt-get update -qq
        sudo apt-get install -y -qq libgtk-3-dev libwebkit2gtk-4.0-dev
    fi

    if ! check_cmd pkg-config; then
        install_if_missing pkg-config pkg-config
    else
        echo "  pkg-config: OK"
    fi

    if ! check_cmd gcc; then
        install_if_missing gcc gcc
    else
        echo "  gcc: OK"
    fi

    echo ""

    # Build
    wails build -o "$APP_NAME-linux-amd64"

    echo ""
    echo "Linux build complete: $OUTPUT_DIR/$APP_NAME-linux-amd64"
}

# ── Windows Cross-Compile ────────────────────────────────

build_windows() {
    echo "=== Building for Windows (amd64, cross-compile) ==="
    echo ""

    # Check for MinGW
    if ! check_cmd x86_64-w64-mingw32-gcc; then
        echo "MinGW not found. Installing..."
        if check_cmd apt-get; then
            sudo apt-get update -qq
            sudo apt-get install -y -qq gcc-mingw-w64-x86-64
        elif check_cmd dnf; then
            sudo dnf install -y mingw64-gcc
        elif check_cmd pacman; then
            sudo pacman -S --noconfirm mingw-w64-gcc
        else
            echo "ERROR: Cannot install MinGW automatically."
            echo "Install mingw-w64 manually and re-run."
            echo ""
            echo "  Ubuntu/Debian: sudo apt install gcc-mingw-w64-x86-64"
            echo "  Fedora:        sudo dnf install mingw64-gcc"
            echo "  Arch:          sudo pacman -S mingw-w64-gcc"
            exit 1
        fi
    else
        echo "  MinGW: OK"
    fi

    echo ""

    # Cross-compile
    CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc \
        wails build -o "$APP_NAME-windows-amd64.exe"

    echo ""
    echo "Windows build complete: $OUTPUT_DIR/$APP_NAME-windows-amd64.exe"
}

# ── macOS Info ───────────────────────────────────────────

info_macos() {
    echo "=== macOS Build ==="
    echo ""
    echo "Cross-compilation to macOS is not supported from Linux."
    echo ""
    echo "Options:"
    echo "  1. Build on a Mac:       wails build"
    echo "  2. Use GitHub Actions:   git tag v1.x.x && git push origin v1.x.x"
    echo ""
}

# ── Main ─────────────────────────────────────────────────

case "$OS" in
    Linux)
        echo "Platform: Linux"
        echo ""
        build_linux

        # Also build Windows if MinGW is available (or can be installed)
        echo ""
        if check_cmd x86_64-w64-mingw32-gcc; then
            build_windows
        else
            echo "=== Skipping Windows (MinGW not installed) ==="
            echo "To enable: sudo apt install gcc-mingw-w64-x86-64"
        fi

        echo ""
        info_macos
        ;;
    Darwin)
        echo "Platform: macOS"
        echo ""
        echo "=== Building for macOS ==="
        wails build -o "$APP_NAME-darwin-$(uname -m)"
        echo ""
        echo "macOS build complete: $OUTPUT_DIR/$APP_NAME-darwin-$(uname -m)"
        echo ""
        echo "Cross-compilation to Linux/Windows from macOS is also possible:"
        echo "  wails build -platform linux/amd64"
        echo "  wails build -platform windows/amd64"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "Platform: Windows (native)"
        echo ""
        echo "=== Building for Windows ==="
        wails build -o "$APP_NAME-windows-amd64.exe"
        echo ""
        echo "Windows build complete: $OUTPUT_DIR/$APP_NAME-windows-amd64.exe"
        ;;
    *)
        echo "ERROR: Unsupported platform: $OS"
        exit 1
        ;;
esac

# ── Summary ──────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════╗"
echo "║            Build Summary             ║"
echo "╚══════════════════════════════════════╝"
echo ""
ls -lh "$OUTPUT_DIR"/ 2>/dev/null || echo "No binaries found"
echo ""
echo "Done."
