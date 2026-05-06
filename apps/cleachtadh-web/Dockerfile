FROM node:22.13.1 AS build
WORKDIR /usr/src/app

COPY package*.json tsconfig*.json ./
COPY apps/cleachtadh-web/package*.json ./apps/cleachtadh-web/
COPY libs/misneach-ui/package*.json ./libs/misneach-ui/
RUN npm ci

COPY apps/cleachtadh-web ./apps/cleachtadh-web
COPY libs/misneach-ui ./libs/misneach-ui

RUN npm run build --workspace cleachtadh-web

FROM node:22.13.1-slim AS runtime
WORKDIR /usr/src/app/apps/cleachtadh-web
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json /usr/src/app/
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/apps/cleachtadh-web/package*.json ./
COPY --from=build /usr/src/app/apps/cleachtadh-web/build ./build

EXPOSE 5175
CMD ["node", "build/index.js"]
