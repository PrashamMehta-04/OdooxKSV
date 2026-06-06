FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3001

# Push schema to DB, seed if empty, then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx ts-node prisma/seed.ts && node dist/index.js"]
