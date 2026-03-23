FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/challenges/package.json apps/challenges/
RUN npm ci --workspace challenges --include-workspace-root

COPY apps/challenges apps/challenges

RUN npm run build --workspace challenges
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/challenges/package.json ./apps/challenges/package.json
COPY --from=build /usr/src/app/apps/challenges/dist ./apps/challenges/dist

WORKDIR /usr/src/app/apps/challenges
CMD ["node", "dist/main"]
