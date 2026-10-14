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

expected_image=$(docker image inspect --format '{{.Id}}' guantearqueros:local)
for service in app payment-expirer; do
  service_id=$(docker compose ps -q "$service")
  test -n "$service_id" || { echo "$service container was not started" >&2; exit 1; }
  running=$(docker inspect --format '{{.State.Running}}' "$service_id")
  actual_image=$(docker inspect --format '{{.Image}}' "$service_id")
  test "$running" = true || { echo "$service container is not running" >&2; exit 1; }
  test "$actual_image" = "$expected_image" || {
    echo "$service is still running an older image; deployment is incomplete" >&2
    exit 1
  }
done

container_id=$(docker compose ps -q app)
for attempt in $(seq 1 24); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$container_id")
  if [ "$health" = healthy ]; then
    # El proceso periódico arranca con la misma imagen y corrige también los
    # pagos pendientes anteriores a este despliegue.
    docker compose exec -T payment-expirer node scripts/expire-payments.mjs
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
