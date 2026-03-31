# Use lightweight Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy full project
COPY . .

# Set environment
ENV NODE_ENV=production

# Your app runs on 4000 (as per server.js)
EXPOSE 4000

# Start your server
CMD ["node", "src/server.js"]