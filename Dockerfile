# ==========================================
# Stage 1: Build the React Application
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
# We use 'npm install' instead of 'ci' to be more forgiving with version conflicts
RUN npm install

# Copy the rest of the source code
COPY . .

# Capture the Environment Variable from Coolify during build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the project (creates the 'build' folder)
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx
# ==========================================
FROM nginx:alpine

# 1. Copy the React build output to Nginx's html folder
COPY --from=builder /app/build /usr/share/nginx/html

# 2. CRITICAL: Copy YOUR custom config to replace Nginx's default config
#    This is the step that makes the routing work!
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]