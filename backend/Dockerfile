FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

RUN mkdir -p /app/public/uploads && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "./bin/www"]
