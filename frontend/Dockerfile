# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite inlines env vars at build time. The browser talks to the backend on the
# host, so this defaults to the host-published backend port.
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
