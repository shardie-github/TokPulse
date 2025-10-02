FROM node:20-alpine
WORKDIR /app
COPY package.json src/ ./apps/meta/
WORKDIR /app/apps/meta
RUN npm pkg set type=module && echo '{}' > package-lock.json
EXPOSE 3001
CMD ["node","src/webhook.js"]
