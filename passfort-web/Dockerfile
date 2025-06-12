FROM node:20-alpine AS build
WORKDIR /app
COPY passfort-web/package.json passfort-web/bun.lockb ./
RUN npm install
COPY passfort-web/. .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY passfort-web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]