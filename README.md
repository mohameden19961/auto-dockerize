# 🐳 auto-dockerize

> Dockerize any project automatically with one command — no configuration needed.

[![npm version](https://img.shields.io/badge/version-1.0.8-blue)](https://github.com/mohameden19961/auto-dockerize/pkgs/npm/auto-dockerize)
[![author](https://img.shields.io/badge/author-mohameden19961-orange)](https://github.com/mohameden19961)

## ✨ Features

- 🔍 **Auto-detects** project type (React, Next.js, Angular, Express, NestJS, Spring Boot, Laravel)
- 🌐 **Reads real port** from `application.properties`, `.env`, `index.js`...
- 🎲 **Picks a free random host port** — no conflicts ever
- 🗄️ **Auto-adds MySQL or PostgreSQL** service for backends
- 🗑️ **Remove command** to clean all Docker files
- 🚀 **One command** to dockerize any project

## 📦 Supported Frameworks

| Framework | Detected by | DB |
|-----------|-------------|-----|
| React (Vite) | `vite.config.js` | ❌ |
| Next.js | `next.config.js` | ❌ |
| Angular | `angular.json` | ❌ |
| Express / Node | `express` in deps | ✅ MySQL / PostgreSQL |
| NestJS | `@nestjs/core` in deps | ✅ MySQL / PostgreSQL |
| Spring Boot | `pom.xml` | ✅ MySQL / PostgreSQL |
| Laravel | `artisan` | ✅ MySQL / PostgreSQL |

## 🚀 Usage

```bash
# Dockerize current project
npx @mohameden19961/auto-dockerize

# Remove Docker files from project
npx @mohameden19961/auto-dockerize remove

# Help
npx @mohameden19961/auto-dockerize help
```

## 📋 Example Output

```bash
🐳 Auto-Dockerize by @mohameden19961

📁 Projet détecté : /home/user/my-spring-app
🔍 Type détecté   : springboot
🌐 Port interne   : 8081
🚪 Port hôte      : 9247 (libre et aléatoire)

✅ Fichiers générés avec succès :
   → Dockerfile
   → docker-compose.yml
   → .dockerignore

🌍 Accès : http://localhost:9247
🗄️  DB port : 15032
```

## 📁 Generated Files

### Dockerfile
Optimized multi-stage build for each framework.

### docker-compose.yml
Includes app + database service with correct environment variables.

### .dockerignore
Excludes `node_modules`, `.git`, `.env`, `dist`, `build`.

## 🛠️ Then just run

```bash
docker compose up --build
```

## 👤 Author

**Abdy Mohameden** — Full-Stack Dev | CS @ SUPNUM Mauritania

- GitHub: [@mohameden19961](https://github.com/mohameden19961)
- Portfolio: [abdymohameden.vercel.app](https://abdymohameden.vercel.app)






