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
docker compose build app
migration_state=$(docker compose run --rm --no-deps --entrypoint node app scripts/apply-inventory-migration.mjs --check | tail -n 1)
if [ "$migration_state" = pending ]; then
  # Mientras el código anterior siga vendiendo, su descuento de stock no conoce
  # las nuevas tallas. Detenerlo evita una diferencia entre migración y recambio.
  docker compose stop app
  if ! docker compose run --rm --no-deps --entrypoint node app scripts/apply-inventory-migration.mjs; then
    docker compose start app
    echo 'Inventory migration failed; previous app restarted' >&2
    exit 1
  fi
elif [ "$migration_state" != ready ]; then
  echo "Unexpected inventory migration state: $migration_state" >&2
  exit 1
fi
docker compose up -d --no-build --remove-orphans

container_id=$(docker compose ps -q app)
test -n "$container_id" || { echo 'App container was not created' >&2; exit 1; }
for attempt in $(seq 1 24); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$container_id")
  if [ "$health" = healthy ]; then
    docker compose exec -T app node --input-type=module - < scripts/smoke-vps.mjs
    # Only unused images and build cache are removed; Docker protects running containers.
    docker image prune --all --force
    docker builder prune --all --force
    docker compose ps
    docker system df
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
