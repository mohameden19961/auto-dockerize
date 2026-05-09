const fs = require('fs');
const path = require('path');
const net = require('net');

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function findFreePort(start = 9000, end = 9999) {
  for (let port = start; port <= end; port++) {
    if (await isPortFree(port)) return port;
  }
  return start;
}

function detectPort(projectPath, defaultPort) {
  const propsPath = path.join(projectPath, 'src/main/resources/application.properties');
  if (fs.existsSync(propsPath)) {
    const props = fs.readFileSync(propsPath, 'utf8');
    const match = props.match(/server\.port\s*=\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  const ymlPath = path.join(projectPath, 'src/main/resources/application.yml');
  if (fs.existsSync(ymlPath)) {
    const yml = fs.readFileSync(ymlPath, 'utf8');
    const match = yml.match(/port:\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  const indexFiles = ['index.js', 'index.ts', 'src/main.ts', 'server.js', 'app.js'];
  for (const file of indexFiles) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/listen\s*\(\s*(\d+)/);
      if (match) return parseInt(match[1]);
    }
  }

  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/PORT\s*=\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  return defaultPort;
}

async function detectProject(projectPath = process.cwd()) {
  const files = fs.readdirSync(projectPath);

  // Next.js
  if (files.includes('next.config.js') || files.includes('next.config.ts') || files.includes('next.config.mjs')) {
    const internalPort = detectPort(projectPath, 3000);
    const hostPort = await findFreePort();
    return { type: 'nextjs', internalPort, hostPort };
  }

  // Angular
  if (files.includes('angular.json')) {
    const hostPort = await findFreePort();
    return { type: 'angular', internalPort: 80, hostPort };
  }

  // React Vite
  if (files.includes('vite.config.js') || files.includes('vite.config.ts')) {
    const hostPort = await findFreePort();
    return { type: 'react-vite', internalPort: 80, hostPort };
  }

  // Spring Boot
  if (files.includes('pom.xml')) {
    const internalPort = detectPort(projectPath, 8080);
    const hostPort = await findFreePort();
    return { type: 'springboot', internalPort, hostPort };
  }

  // Laravel
  if (files.includes('artisan')) {
    const internalPort = detectPort(projectPath, 8000);
    const hostPort = await findFreePort();
    return { type: 'laravel', internalPort, hostPort };
  }

  // Node / Express / NestJS
  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const internalPort = detectPort(projectPath, 3000);
    const hostPort = await findFreePort();
    if (deps['@nestjs/core']) return { type: 'nestjs', internalPort, hostPort };
    if (deps['express']) return { type: 'express', internalPort, hostPort };
    return { type: 'node', internalPort, hostPort };
  }

  // Flutter
  if (files.includes('pubspec.yaml')) {
    return { type: 'flutter', internalPort: null, hostPort: null };
  }

  const internalPort = detectPort(projectPath, 3000);
  const hostPort = await findFreePort();
  return { type: 'unknown', internalPort, hostPort };
}

module.exports = { detectProject };
