const fs = require('fs');
const path = require('path');

const dbServices = {
  mysql: (dbPort) => `
  db:
    image: mysql:8
    ports:
      - "${dbPort}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=appdb
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:`,

  postgres: (dbPort) => `
  db:
    image: postgres:16-alpine
    ports:
      - "${dbPort}:5432"
    environment:
      - POSTGRES_USER=root
      - POSTGRES_PASSWORD=root
      - POSTGRES_DB=appdb
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db_data:`,
};

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

  angular: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --prod

FROM nginx:alpine
COPY --from=builder /app/dist/*/browser /usr/share/nginx/html
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

function detectDbType(projectPath) {
  // package.json
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['pg'] || deps['@prisma/client'] && fs.existsSync(path.join(projectPath, 'prisma'))) return 'postgres';
    if (deps['mysql'] || deps['mysql2']) return 'mysql';
    if (deps['mongoose'] || deps['mongodb']) return null; // MongoDB = pas dans compose ici
  }

  // pom.xml
  const pomPath = path.join(projectPath, 'pom.xml');
  if (fs.existsSync(pomPath)) {
    const pom = fs.readFileSync(pomPath, 'utf8');
    if (pom.includes('postgresql')) return 'postgres';
    return 'mysql';
  }

  // application.properties
  const propsPath = path.join(projectPath, 'src/main/resources/application.properties');
  if (fs.existsSync(propsPath)) {
    const props = fs.readFileSync(propsPath, 'utf8');
    if (props.includes('postgresql')) return 'postgres';
    if (props.includes('mysql')) return 'mysql';
  }

  return 'mysql';
}

async function generateFiles(projectInfo, projectPath = process.cwd()) {
  const { type, internalPort, hostPort } = projectInfo;
  const name = path.basename(projectPath);

  // Détecter le type de DB
  const dbType = detectDbType(projectPath);

  // Dockerfile
  let dockerfile = dockerfiles[type] || dockerfiles.unknown;

  if (type === 'express' || type === 'node' || type === 'unknown') {
    const entrypoint = detectEntrypoint(projectPath);
    dockerfile = dockerfile.replace('CMD ["node", "index.js"]', `CMD ["node", "${entrypoint}"]`);
    dockerfile += `\nEXPOSE ${internalPort}`;
  } else if (type !== 'react-vite' && type !== 'angular' && type !== 'nextjs') {
    dockerfile += `\nEXPOSE ${internalPort}`;
  }

  fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

  // DB port libre aléatoire entre 15000-15999
  const net = require('net');
  let dbPort = 15000;
  for (let p = 15000; p <= 15999; p++) {
    const free = await new Promise((resolve) => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => { s.close(); resolve(true); });
      s.listen(p);
    });
    if (free) { dbPort = p; break; }
  }

  // Générer le compose
  const frontendTypes = ['react-vite', 'angular', 'nextjs'];
  const needsDb = !frontendTypes.includes(type);

  let envBlock = '';
  let dbBlock = '';

  if (needsDb && dbType) {
    const dbSvc = dbServices[dbType](dbPort);

    if (type === 'springboot') {
      const url = dbType === 'postgres'
        ? `jdbc:postgresql://db:5432/appdb`
        : `jdbc:mysql://db:3306/appdb`;
      envBlock = `environment:
      - SPRING_DATASOURCE_URL=${url}
      - SPRING_DATASOURCE_USERNAME=root
      - SPRING_DATASOURCE_PASSWORD=root
    `;
    } else if (type === 'express' || type === 'nestjs' || type === 'node') {
      const url = dbType === 'postgres'
        ? `postgresql://root:root@db:5432/appdb`
        : `mysql://root:root@db:3306/appdb`;
      envBlock = `environment:
      - NODE_ENV=production
      - DATABASE_URL=${url}
    `;
    } else if (type === 'laravel') {
      envBlock = `environment:
      - DB_HOST=db
      - DB_PORT=${dbType === 'postgres' ? 5432 : 3306}
      - DB_DATABASE=appdb
      - DB_USERNAME=root
      - DB_PASSWORD=root
    `;
    }

    dbBlock = `\n${dbSvc}`;
  }

  const compose = `services:
  ${name}:
    build: .
    ports:
      - "${hostPort}:${internalPort}"
    ${envBlock}${needsDb && dbType ? `depends_on:\n      - db\n    restart: unless-stopped` : `restart: unless-stopped`}${dbBlock}`;

  fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), compose);

  fs.writeFileSync(path.join(projectPath, '.dockerignore'),
    `node_modules\n.git\n.env\ndist\nbuild\n*.log\n.DS_Store`
  );

  return { hostPort, internalPort, dbPort: needsDb && dbType ? dbPort : null };
}

module.exports = { generateFiles };
