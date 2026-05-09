#!/bin/bash

git checkout main
git pull

for i in $(seq 4 20); do
  BRANCH="improve/boost-$i"
  git checkout -b $BRANCH
  echo "" >> README.md
  git add .
  git commit -m "docs: improvement $i"
  gh pr create --title "improvement $i" --body "boost pull shark" --base main
  gh pr merge --squash
  git checkout main
  git pull
  echo "✅ PR $i mergé !"
done

echo "🦈 Pull Shark boost terminé !"
