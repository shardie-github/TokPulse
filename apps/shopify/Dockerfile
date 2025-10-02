FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json src/ ./
RUN npm pkg set type=module && echo '{}' > package-lock.json
USER node
EXPOSE 3000
CMD ["node","src/server.js"]
