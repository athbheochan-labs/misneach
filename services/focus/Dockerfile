FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/focus/package.json services/focus/
RUN npm ci --workspace focus --include-workspace-root

COPY services/focus services/focus

RUN npm run build --workspace focus
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/services/focus/package.json ./services/focus/package.json
COPY --from=build /usr/src/app/services/focus/dist ./services/focus/dist

WORKDIR /usr/src/app/services/focus
CMD ["node", "dist/main"]
