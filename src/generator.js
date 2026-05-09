const fs = require('fs');
const path = require('path');

const templates = {
  nextjs: {
    dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "13000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped`,
  },

  'react-vite': {
    dockerfile: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "10080:80"
    restart: unless-stopped`,
  },

  express: {
    dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "13001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:root@db:3306/appdb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    ports:
      - "13306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=appdb
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:`,
  },

  nestjs: {
    dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "13002:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:root@db:3306/appdb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    ports:
      - "13306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=appdb
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:`,
  },

  springboot: {
    dockerfile: `FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "18080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/appdb
      - SPRING_DATASOURCE_USERNAME=root
      - SPRING_DATASOURCE_PASSWORD=root
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    ports:
      - "13306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=appdb
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:`,
  },

  laravel: {
    dockerfile: `FROM php:8.2-fpm-alpine
WORKDIR /var/www
RUN apk add --no-cache composer
COPY composer*.json ./
RUN composer install --no-dev
COPY . .
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "18000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=appdb
      - DB_USERNAME=root
      - DB_PASSWORD=root
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    ports:
      - "13306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=appdb
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:`,
  },

  unknown: {
    dockerfile: `FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`,
    compose: (name) => `services:
  ${name}:
    build: .
    ports:
      - "19000:3000"
    restart: unless-stopped`,
  },
};

function generateFiles(projectInfo, projectPath = process.cwd()) {
  const template = templates[projectInfo.type] || templates.unknown;
  const name = path.basename(projectPath);

  fs.writeFileSync(path.join(projectPath, 'Dockerfile'), template.dockerfile);
  fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), template.compose(name));

  const dockerignore = `node_modules
.git
.env
dist
build
*.log
.DS_Store`;
  fs.writeFileSync(path.join(projectPath, '.dockerignore'), dockerignore);
}

module.exports = { generateFiles };
