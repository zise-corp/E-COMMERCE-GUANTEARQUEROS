#!/usr/bin/env bash
set -euo pipefail

project_path=${1:?Missing project path}
expected_sha=${2:?Missing commit SHA}

cd "$project_path"
test -f .env || { echo 'Missing server .env' >&2; exit 1; }
test "$(git branch --show-current)" = main || { echo 'Server checkout must be on main' >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo 'Server checkout has local changes' >&2; exit 1; }

git fetch origin main
test "$(git rev-parse origin/main)" = "$expected_sha" || {
  echo 'main moved since this workflow started; run the latest deployment instead' >&2
  exit 1
}
git merge --ff-only origin/main

docker compose config --quiet
docker compose up -d --build

container_id=$(docker compose ps -q app)
test -n "$container_id" || { echo 'App container was not created' >&2; exit 1; }
for attempt in $(seq 1 24); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$container_id")
  if [ "$health" = healthy ]; then
    docker compose ps
    exit 0
  fi
  if [ "$health" = unhealthy ]; then
    echo 'App healthcheck failed; inspect docker compose logs on the VPS' >&2
    exit 1
  fi
  sleep 5
done

echo 'App did not become healthy in time; inspect docker compose logs on the VPS' >&2
exit 1
