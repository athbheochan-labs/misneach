FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/entrypoint.sh ./entrypoint.sh

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
