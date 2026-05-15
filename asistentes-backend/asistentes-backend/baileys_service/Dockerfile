FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
