# 🐳 auto-dockerize

Dockerize any project automatically with one command.

## Usage

```bash
npx @mohameden19961/auto-dockerize
```

## Supported projects

| Type | Detected by |
|------|-------------|
| Next.js | `next.config.js` |
| React Vite | `vite.config.js` |
| Spring Boot | `pom.xml` |
| Express | `express` in dependencies |
| NestJS | `@nestjs/core` in dependencies |
| Laravel | `artisan` file |
| Flutter | `pubspec.yaml` |

## Example

```bash
cd my-project
npx @mohameden19961/auto-dockerize

# Output:
# ✅ Dockerfile
# ✅ docker-compose.yml
# ✅ .dockerignore
```
