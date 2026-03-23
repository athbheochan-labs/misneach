FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/practice/package.json apps/practice/
COPY libs/messaging/package.json libs/messaging/
RUN npm ci --workspace practice --workspace @decyphr/messaging --include-workspace-root

COPY apps/practice apps/practice
COPY libs/messaging libs/messaging

RUN npm run build --workspace @decyphr/messaging
RUN npm run build --workspace practice
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/practice/package.json ./apps/practice/package.json
COPY --from=build /usr/src/app/apps/practice/dist ./apps/practice/dist
COPY --from=build /usr/src/app/apps/practice/entrypoint.sh ./apps/practice/entrypoint.sh
COPY --from=build /usr/src/app/libs/messaging ./libs/messaging

WORKDIR /usr/src/app/apps/practice
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
