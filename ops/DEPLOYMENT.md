# Octio Website — Deployment

The frontend builds in GitLab CI and pushes a Docker image to
`registry.gitlab.com/octio-dev/website:qa`. From there an Ansible playbook
deploys it onto the octioqa host alongside the other services managed by
`tabbris-nginx`.

This doc is the handoff for whoever owns the Ansible role — it contains the
exact compose and nginx snippets they need to produce.

## Pipeline overview

```
main branch push
    │
    ▼
GitLab CI (.gitlab-ci.yml)
    │ build: node:22-alpine → npm ci && npm run build → dist/
    │ package: docker build -f Prod.Dockerfile → push to registry
    ▼
registry.gitlab.com/octio-dev/website:qa
    │
    ▼
Ansible run (octioqa host)
    │ writes /home/sys-admin/octio-website/compose.yml
    │ writes tabbris-nginx upstream + server block
    │ docker compose up -d
    ▼
https://qa.octio.co.za → octio-website-qa container
```

## Target compose file

`/home/sys-admin/octio-website/compose.yml`

```yaml
#
# Ansible managed
#
services:
  octio-website-qa:
    image: ${DOCKER_REGISTRY:-registry.gitlab.com/octio-dev}/website:${IMAGE_TAG:-qa}
    container_name: octio-website-qa
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://localhost/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - tabbris
    labels:
      - "traefik.enable=false"

networks:
  default:
    name: octio-website-internal
  tabbris:
    external: true
    name: tabbris
```

Join the existing `tabbris` network so `tabbris-nginx` can reach the
container by name. No host port binding — all traffic comes through
`tabbris-nginx`.

## Required nginx routing block

Add to `/home/sys-admin/app/nginx/nginx.conf` inside the `http {}` block
(before the `server { server_name localhost; }` default):

```nginx
upstream octio-website-qa {
    server octio-website-qa:80;
}

server {
    listen 80;
    listen [::]:80;
    server_name qa.octio.co.za;

    access_log /var/log/nginx/octio-website-qa.access.log main;
    error_log  /var/log/nginx/octio-website-qa.error.log;

    location / {
        proxy_pass http://octio-website-qa;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;

        # Large voice note and file uploads from the wizard
        client_max_body_size 25M;
    }
}
```

## DNS

`qa.octio.co.za` must resolve to the octioqa host IP. Today `octio.co.za`
points to `156.38.139.114` via GoDaddy DNS, which is NOT octioqa. Before the
first deploy works, add an `A` record for `qa.octio.co.za` pointing to
whatever IP octioqa is reachable at.

## Registry auth

The `package` job uses `gitlab-ci-token` which is created automatically by
GitLab. No secrets to configure in CI vars.

On octioqa, `docker pull` needs auth to pull from
`registry.gitlab.com/octio-dev/*`. Existing services already authenticate
(see fleximobile-qa, nedbank-qa-gateway, flex-qa-app) so the same credentials
work for this image — no extra setup needed.

## First deploy checklist

- [ ] Ansible role writes `/home/sys-admin/octio-website/compose.yml`
- [ ] Ansible role updates `/home/sys-admin/app/nginx/nginx.conf` with the
      upstream + server block above
- [ ] `qa.octio.co.za` DNS record points to octioqa
- [ ] `docker compose -f /home/sys-admin/octio-website/compose.yml pull && up -d`
- [ ] `docker exec tabbris-nginx nginx -s reload`
- [ ] `curl -sI -H 'Host: qa.octio.co.za' http://localhost/health` returns 200

## Rollback

Ansible should tag each deploy with the short SHA so rollback is:

```bash
cd /home/sys-admin/octio-website
IMAGE_TAG=<previous-sha> docker compose up -d
```

## Debugging

```bash
# Container logs
docker logs octio-website-qa --tail 100 -f

# Verify the SPA fallback is working
docker exec octio-website-qa wget -q -O - http://localhost/some/spa/route

# Check nginx is routing correctly
docker exec tabbris-nginx nginx -t
docker logs tabbris-nginx --tail 50 | grep octio
```
