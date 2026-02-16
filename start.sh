#!/bin/sh
set -e

# Start nginx in background
nginx || { echo "Failed to start nginx"; exit 1; }

# Start Node.js upload server
cd /app || { echo "Failed to change directory"; exit 1; }
node index.js || { echo "Failed to start Node.js server"; exit 1; }
