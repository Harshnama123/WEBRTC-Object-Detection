FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories
RUN mkdir -p bench frontend backend

# Make scripts executable
RUN chmod +x start.sh bench/run_bench.sh

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "start"]
