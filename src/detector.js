const fs = require('fs');
const path = require('path');

function detectPort(projectPath, defaultPort) {
  // Spring Boot: lire application.properties
  const propsPath = path.join(projectPath, 'src/main/resources/application.properties');
  if (fs.existsSync(propsPath)) {
    const props = fs.readFileSync(propsPath, 'utf8');
    const match = props.match(/server\.port\s*=\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  // Spring Boot: lire application.yml
  const ymlPath = path.join(projectPath, 'src/main/resources/application.yml');
  if (fs.existsSync(ymlPath)) {
    const yml = fs.readFileSync(ymlPath, 'utf8');
    const match = yml.match(/port:\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  // Node/Express/NestJS: lire index.js ou main.ts
  const indexFiles = ['index.js', 'index.ts', 'src/main.ts', 'server.js'];
  for (const file of indexFiles) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/listen\s*\(\s*(\d+)/);
      if (match) return parseInt(match[1]);
    }
  }

  // .env
  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/PORT\s*=\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  return defaultPort;
}

function detectProject(projectPath = process.cwd()) {
  const files = fs.readdirSync(projectPath);

  // Next.js
  if (files.includes('next.config.js') || files.includes('next.config.ts')) {
    const port = detectPort(projectPath, 3000);
    return { type: 'nextjs', port };
  }

  // React Vite
  if (files.includes('vite.config.js') || files.includes('vite.config.ts')) {
    const port = detectPort(projectPath, 5173);
    return { type: 'react-vite', port };
  }

  // Spring Boot
  if (files.includes('pom.xml')) {
    const port = detectPort(projectPath, 8080);
    return { type: 'springboot', port };
  }

  // Node / Express / NestJS
  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['@nestjs/core']) {
      const port = detectPort(projectPath, 3000);
      return { type: 'nestjs', port };
    }
    if (deps['express']) {
      const port = detectPort(projectPath, 3000);
      return { type: 'express', port };
    }
    const port = detectPort(projectPath, 3000);
    return { type: 'node', port };
  }

  // Laravel
  if (files.includes('artisan')) {
    const port = detectPort(projectPath, 8000);
    return { type: 'laravel', port };
  }

  // Flutter
  if (files.includes('pubspec.yaml')) {
    return { type: 'flutter', port: null };
  }

  return { type: 'unknown', port: detectPort(projectPath, 3000) };
}

module.exports = { detectProject };
