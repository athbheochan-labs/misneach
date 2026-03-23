FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/phrasebook/package.json apps/phrasebook/
COPY libs/messaging/package.json libs/messaging/
RUN npm ci --workspace phrasebook --workspace @decyphr/messaging --include-workspace-root

COPY apps/phrasebook apps/phrasebook
COPY libs/messaging libs/messaging

RUN npm run build --workspace @decyphr/messaging
RUN npm run build --workspace phrasebook
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/phrasebook/package.json ./apps/phrasebook/package.json
COPY --from=build /usr/src/app/apps/phrasebook/dist ./apps/phrasebook/dist
COPY --from=build /usr/src/app/apps/phrasebook/entrypoint.sh ./apps/phrasebook/entrypoint.sh
COPY --from=build /usr/src/app/libs/messaging ./libs/messaging

WORKDIR /usr/src/app/apps/phrasebook
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
