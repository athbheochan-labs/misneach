FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/flashcards/package.json services/flashcards/
COPY libs/messaging/package.json libs/messaging/
RUN npm ci --workspace flashcards --workspace @decyphr/messaging --include-workspace-root

COPY services/flashcards services/flashcards
COPY libs/messaging libs/messaging

RUN npm run build --workspace @decyphr/messaging
RUN npm run build --workspace flashcards
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/services/flashcards/package.json ./services/flashcards/package.json
COPY --from=build /usr/src/app/services/flashcards/dist ./services/flashcards/dist
COPY --from=build /usr/src/app/services/flashcards/entrypoint.sh ./services/flashcards/entrypoint.sh
COPY --from=build /usr/src/app/libs/messaging ./libs/messaging

WORKDIR /usr/src/app/services/flashcards
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
