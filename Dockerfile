FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    gcc-mingw-w64-x86-64 \
    pkg-config \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    curl \
    git \
    zip \
    && rm -rf /var/lib/apt/lists/*

# Go
RUN curl -fsSL https://go.dev/dl/go1.25.0.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin

# Wails
RUN go install github.com/wailsapp/wails/v2/cmd/wails@latest

WORKDIR /app

# Copy source
COPY . .

# Build
CMD ["./build.sh"]
