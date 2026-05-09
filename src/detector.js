const fs = require('fs');
const path = require('path');

function detectProject(projectPath = process.cwd()) {
  const files = fs.readdirSync(projectPath);

  // Next.js
  if (files.includes('next.config.js') || files.includes('next.config.ts')) {
    return { type: 'nextjs', port: 3000 };
  }

  // React (Vite)
  if (files.includes('vite.config.js') || files.includes('vite.config.ts')) {
    return { type: 'react-vite', port: 5173 };
  }

  // Spring Boot
  if (files.includes('pom.xml')) {
    return { type: 'springboot', port: 8080 };
  }

  // Node / Express
  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['express']) return { type: 'express', port: 3000 };
    if (deps['nestjs'] || deps['@nestjs/core']) return { type: 'nestjs', port: 3000 };
    return { type: 'node', port: 3000 };
  }

  // Laravel
  if (files.includes('artisan')) {
    return { type: 'laravel', port: 8000 };
  }

  // Flutter
  if (files.includes('pubspec.yaml')) {
    return { type: 'flutter', port: null };
  }

  return { type: 'unknown', port: 3000 };
}

module.exports = { detectProject };
