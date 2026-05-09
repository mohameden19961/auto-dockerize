#!/usr/bin/env node

const path = require('path');
const { detectProject } = require('../src/detector');
const { generateFiles } = require('../src/generator');

const projectPath = process.argv[2] 
  ? path.resolve(process.argv[2]) 
  : process.cwd();

console.log('\n🐳 Auto-Dockerize by @mohameden19961\n');
console.log(`📁 Projet détecté : ${projectPath}`);

const projectInfo = detectProject(projectPath);
console.log(`🔍 Type détecté   : ${projectInfo.type}`);
if (projectInfo.port) {
  console.log(`🌐 Port           : ${projectInfo.port}`);
}

generateFiles(projectInfo, projectPath);

console.log('\n✅ Fichiers générés avec succès :');
console.log('   → Dockerfile');
console.log('   → docker-compose.yml');
console.log('   → .dockerignore');
console.log('\n🚀 Pour lancer :');
console.log('   docker compose up --build\n');
