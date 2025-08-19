#!/bin/bash

echo "🚀 Starting faizSync Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the server
echo "🔨 Building server..."
npm run build

# Start the server
PORT=${PORT:-1420}
BASE_DIR_ARG="$1"
if [ -n "$BASE_DIR_ARG" ]; then
  export BASE_DIR="$BASE_DIR_ARG"
fi

echo "🔄 Starting server on port $PORT..."
echo "📡 WebSocket URL: ws://0.0.0.0:$PORT"
if [ -n "$BASE_DIR" ]; then
  echo "📁 Watching folder: $BASE_DIR"
else
  echo "📁 Files will be stored in: ./synced-files/"
fi
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

PORT=$PORT npm start
