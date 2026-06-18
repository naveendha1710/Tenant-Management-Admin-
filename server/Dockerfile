FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy server files
COPY index.js .env ./
COPY services ./services
COPY routes ./routes
COPY ./server/middleware ./middleware 

# Copy built frontend
COPY client/build ./client/build

# Create required directories
RUN mkdir -p /app/uploads /app/config /app/logs

EXPOSE 3000
CMD ["node", "index.js"]