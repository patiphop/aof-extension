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
echo "🔄 Starting server on port 1420..."
echo "📡 WebSocket URL: ws://localhost:1420"
echo "📁 Files will be stored in: ./synced-files/"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

npm start
