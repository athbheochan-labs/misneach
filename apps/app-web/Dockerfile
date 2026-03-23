FROM node:22.13.1 AS build
WORKDIR /usr/src/app

COPY package*.json tsconfig*.json ./
COPY apps/app-web/package*.json ./apps/app-web/
COPY libs/misneach-ui/package*.json ./libs/misneach-ui/
RUN npm ci

COPY apps/app-web ./apps/app-web
COPY libs/misneach-ui ./libs/misneach-ui

RUN npm run build --workspace app-web

FROM node:22.13.1-slim AS runtime
WORKDIR /usr/src/app/apps/app-web
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json /usr/src/app/
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/apps/app-web/package*.json ./
COPY --from=build /usr/src/app/apps/app-web/build ./build

EXPOSE 5175
CMD ["node", "build/index.js"]
