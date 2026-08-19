FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package and shared files
COPY backend/package*.json ./backend/
COPY shared ./shared/

WORKDIR /app/backend

# Install dependencies and copy backend code
RUN npm install
COPY backend/ ./

# Generate Prisma client and build typescript
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
