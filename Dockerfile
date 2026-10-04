# 1) Compila el frontend (Three.js + Vite)
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# 2) Servidor: API + archivos estáticos del juego
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ .
COPY --from=web /web/dist ./public
ENV PORT=3000 DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server.js"]
