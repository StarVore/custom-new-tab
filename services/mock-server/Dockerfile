FROM node:20-alpine

WORKDIR /app

COPY server.js .
COPY JSONs/ ./JSONs/

EXPOSE 3000

CMD ["node", "server.js"]
