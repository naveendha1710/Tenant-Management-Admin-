# Production stage
FROM node:18-alpine

# Create directories
RUN mkdir -p /app/uploads /app/client/build /app/config /app/logs

# Copy built frontend from server/client/build
COPY server/client/build /app/client/build

# Copy Logo folder to build
COPY Logo /app/client/build/Logo

# Copy backend server
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/index.js ./
COPY server/.env* ./
COPY server/services ./services
COPY server/middleware ./middleware 

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "index.js"]