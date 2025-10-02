FROM node:20-alpine
WORKDIR /app
COPY package.json src/ ./apps/support/
WORKDIR /app/apps/support
RUN npm pkg set type=module && echo '{}' > package-lock.json
EXPOSE 3002
CMD ["node","src/server.js"]
