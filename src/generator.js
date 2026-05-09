const fs = require('fs');
const path = require('path');

function getHostPort(port) {
  return 10000 + port;
}

function getCompose(name, port, extraEnv = '', dbService = '') {
  const hostPort = getHostPort(port);
  return `services:
  ${name}:
    build: .
    ports:
      - "${hostPort}:${port}"
    ${extraEnv}${dbService ? `depends_on:\n      - db\n    restart: unless-stopped\n${dbService}` : 'restart: unless-stopped'}`;
}

const dbService = `
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
  db_data:`;

const dockerfiles = {
  nextjs: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,

  'react-vite': `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,

  express: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "index.js"]`,

  nestjs: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/main"]`,

  springboot: `FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
CMD ["java", "-jar", "app.jar"]`,

  laravel: `FROM php:8.2-fpm-alpine
WORKDIR /var/www
RUN apk add --no-cache composer
COPY composer*.json ./
RUN composer install --no-dev
COPY . .
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]`,

  unknown: `FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "index.js"]`,
};

function detectEntrypoint(projectPath) {
  const candidates = ['index.js', 'app.js', 'server.js', 'src/index.js', 'src/app.js'];
  for (const file of candidates) {
    if (fs.existsSync(path.join(projectPath, file))) return file;
  }
  return 'index.js';
}

function generateFiles(projectInfo, projectPath = process.cwd()) {
  let { type, port } = projectInfo;
  const name = path.basename(projectPath);

  // React Vite = toujours nginx sur port 80 en production
  if (type === 'react-vite') port = 80;

  // Next.js = toujours port 3000
  if (type === 'nextjs') port = 3000;

  let dockerfile = dockerfiles[type] || dockerfiles.unknown;

  // Express/Node: détecter le vrai fichier d'entrée
  if (type === 'express' || type === 'node' || type === 'unknown') {
    const entrypoint = detectEntrypoint(projectPath);
    dockerfile = dockerfile.replace('CMD ["node", "index.js"]', `CMD ["node", "${entrypoint}"]`);
    dockerfile += `\nEXPOSE ${port}`;
  } else if (type === 'react-vite') {
    // Dockerfile react-vite a déjà EXPOSE 80
  } else if (type === 'nextjs') {
    // Dockerfile nextjs a déjà EXPOSE 3000
  } else {
    dockerfile += `\nEXPOSE ${port}`;
  }

  fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

  // docker-compose.yml selon le type
  let compose = '';

  if (type === 'springboot') {
    compose = getCompose(name, port,
      `environment:\n      - SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/appdb\n      - SPRING_DATASOURCE_USERNAME=root\n      - SPRING_DATASOURCE_PASSWORD=root\n    `,
      dbService
    );
  } else if (type === 'express' || type === 'nestjs') {
    compose = getCompose(name, port,
      `environment:\n      - NODE_ENV=production\n      - DATABASE_URL=mysql://root:root@db:3306/appdb\n    `,
      dbService
    );
  } else if (type === 'laravel') {
    compose = getCompose(name, port,
      `environment:\n      - DB_HOST=db\n      - DB_PORT=3306\n      - DB_DATABASE=appdb\n      - DB_USERNAME=root\n      - DB_PASSWORD=root\n    `,
      dbService
    );
  } else {
    compose = getCompose(name, port);
  }

  fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), compose);

  fs.writeFileSync(path.join(projectPath, '.dockerignore'),
    `node_modules\n.git\n.env\ndist\nbuild\n*.log\n.DS_Store`
  );
}

module.exports = { generateFiles };
