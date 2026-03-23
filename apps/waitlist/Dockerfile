FROM node:23.5.0 AS build
WORKDIR /usr/src/app/apps/waitlist

COPY apps/waitlist/package*.json ./
RUN npm install
COPY apps/waitlist ./
RUN npm run build

FROM node:23.5.0-slim AS runtime
WORKDIR /usr/src/app/apps/waitlist
ENV NODE_ENV=production

COPY --from=build /usr/src/app/apps/waitlist/package*.json ./
COPY --from=build /usr/src/app/apps/waitlist/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/waitlist/dist ./dist

EXPOSE 3021
CMD ["node", "dist/main"]
