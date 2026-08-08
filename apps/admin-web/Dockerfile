FROM node:22.13.1 AS build
WORKDIR /usr/src/app

COPY package*.json tsconfig*.json ./
COPY apps/admin-web/package*.json ./apps/admin-web/
RUN npm ci

COPY apps/admin-web ./apps/admin-web

RUN npm run build --workspace admin-web

FROM node:22.13.1-slim AS runtime
WORKDIR /usr/src/app/apps/admin-web
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json /usr/src/app/
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/apps/admin-web/package*.json ./
COPY --from=build /usr/src/app/apps/admin-web/build ./build

EXPOSE 5174
CMD ["node", "build/index.js"]
