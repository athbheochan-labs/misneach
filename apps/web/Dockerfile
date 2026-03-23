FROM node:20-alpine
WORKDIR /app/apps/web

COPY apps/web/package*.json ./
RUN npm install
COPY apps/web ./
COPY libs/misneach-ui /app/libs/misneach-ui
COPY content /app/content
COPY apps/courses/src/content /app/apps/courses/src/content

RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "preview"]
