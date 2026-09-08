FROM node:22-alpine

WORKDIR /app

# Kopier package files
COPY package*.json ./

# Installer alle dependencies (inkluderer dev for å bygge)
RUN npm install

# Kopier hele prosjektet
COPY . .

# Bygg frontend
RUN npm run build

# Sett miljøvariabel til produksjon
ENV NODE_ENV=production

# Exponer port 8080 (Cloud Run standard)
EXPOSE 8080

# Start serveren
CMD ["npx", "tsx", "server.ts"]
