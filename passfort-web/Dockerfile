FROM oven/bun:1.1.13-alpine AS build

WORKDIR /app

# Copy package files
COPY passfort-web/package.json passfort-web/bun.lockb ./

# Install dependencies using bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY passfort-web/nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 