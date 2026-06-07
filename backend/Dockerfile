# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Bring compiled output and the source needed by the ts-node seed script.
COPY --from=build /app/dist ./dist
COPY tsconfig*.json ./
COPY src ./src
# ts-node + typescript are devDependencies needed by `npm run seed`; install them.
RUN npm install ts-node typescript --no-save
EXPOSE 3000
CMD ["node", "dist/main.js"]
