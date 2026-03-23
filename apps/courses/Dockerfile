FROM node:23.5.0 AS build
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/courses/package.json apps/courses/
RUN npm ci --workspace courses --include-workspace-root

COPY apps/courses apps/courses

RUN npm run build --workspace courses
RUN npm prune --omit=dev --workspaces --include-workspace-root

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/courses/package.json ./apps/courses/package.json
COPY --from=build /usr/src/app/apps/courses/dist ./apps/courses/dist
COPY --from=build /usr/src/app/apps/courses/entrypoint.sh ./apps/courses/entrypoint.sh

WORKDIR /usr/src/app/apps/courses
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
