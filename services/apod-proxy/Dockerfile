FROM node:20-alpine

WORKDIR /app

COPY services/apod-proxy/server.js ./server.js

EXPOSE 3001

CMD ["node", "server.js"]
