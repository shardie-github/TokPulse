FROM node:20-alpine
WORKDIR /app
COPY package.json src/ ./apps/dashboard-server/
WORKDIR /app/apps/dashboard-server
RUN npm pkg set type=module && echo '{}' > package-lock.json
# Expect host volumes for dist and data; start server
EXPOSE 4173
CMD ["node","src/server.js"]
