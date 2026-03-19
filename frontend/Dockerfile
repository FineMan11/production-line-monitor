FROM node:20-alpine

WORKDIR /app

# Install dependencies first (separate layer)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is REQUIRED — without it, Vite only listens on localhost
# inside the container, and Nginx cannot reach it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
