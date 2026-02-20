# Stage 1: Build
# Start from a Node.js base image. "20-alpine" means Node 20 on Alpine Linux,
# which is a tiny Linux distro (~5MB). This keeps your final image small.
FROM node:20-alpine AS builder

# Set the working directory inside the container. Every command after this
# runs from /app, just like doing "cd /app".
WORKDIR /app

# Copy ONLY the package files first. Docker caches each step — if these files
# haven't changed, Docker skips the "npm install" step on the next build.
# This is the single biggest optimization for build speed.
COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDependencies, since we need them to build)
RUN npm ci

# NOW copy the rest of the source code
COPY . .

# Build the React client into static files
RUN npm run build --workspace=packages/client

# Build the TypeScript server into JavaScript
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/server


# Stage 2: Production
# Start fresh from a clean Node image — this throws away all the build tools,
# devDependencies, and source code. Only the compiled output carries forward.
# This is called a "multi-stage build" and it dramatically reduces image size.
FROM node:20-alpine

WORKDIR /app

# Copy package files again into the clean image
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install ONLY production dependencies (no devDependencies)
RUN npm ci --omit=dev

# Copy the built client files from the builder stage
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Copy the built server files from the builder stage
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# Copy the built shared files from the builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create the data directory where SQLite will live
RUN mkdir -p /app/packages/server/data

# Tell Docker this container listens on port 3001
# (This is documentation — it doesn't actually open the port)
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# The command that runs when the container starts
CMD ["node", "packages/server/dist/index.js"]
