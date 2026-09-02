# bc1q21 production infrastructure reference

This directory versions the non-secret production infrastructure and privileged deployment machinery used by bc1q21. The repository copies are references for review and controlled installation; production privileged files must remain root-owned and must not be symlinked to the writable application repository.

## Deployment

- Repository reference: `infrastructure/deployment/bc1q21-deploy.sh`
- Production path: `/usr/local/bin/bc1q21-deploy.sh`
- Production ownership/mode: `root:root`, `0755`
- GitHub Actions passes the approved 40-character `${{ github.sha }}` to the script.
- The script rejects missing/invalid SHAs, refuses a dirty production repository, fetches `origin/main`, verifies the approved commit exists and is contained in `origin/main`, and refuses backward/unrelated deployments.
- A server-side `flock` prevents overlapping deployments.
- Git and dependency installation run as `bc1q21`; the root script performs the backend service restart.
- On deployment failure after the target reset, rollback restores the prior Git commit, reapplies that commit's pinned requirements, and restarts the backend.
- Dependency rollback uses the shared virtual environment and is therefore best-effort: packages added by a failed newer release may remain installed even after the prior requirements are re-applied.
- Static website/application paths are served through symlinks into the repository, so repository changes to static files become visible when the working tree is reset. Deployment is not an atomic release-directory/symlink switch.

## systemd

- Repository reference: `infrastructure/systemd/bc1q21.service`
- Production path: `/etc/systemd/system/bc1q21.service`
- Production ownership/mode: `root:root`, `0644`
- Backend process runs as `bc1q21:bc1q21` and binds to `127.0.0.1:8000`.
- Secrets are loaded from `/etc/bc1q21/bc1q21.env`; that environment file is intentionally not versioned.

## sudoers

- Repository reference: `infrastructure/sudoers/bc1q21-deploy`
- Production path: `/etc/sudoers.d/bc1q21-deploy`
- Production ownership/mode: `root:root`, `0440`
- Current Phase 1 boundary allows `bc1q21` to invoke only the root-owned deployment script without a password.
- A future hardening phase may run the deployment script unprivileged and narrow sudo to the exact required service-management command after separate testing.

## Let's Encrypt

- Repository reference: `infrastructure/letsencrypt/reload-nginx.sh`
- Production path: `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`
- Production ownership/mode: `root:root`, `0755`
- The standard Certbot systemd timer performs renewal. The deploy hook validates nginx before reloading it after successful renewal.

## nginx

See `infrastructure/nginx/README.md` and `infrastructure/nginx/bc1q21.conf`. The reference includes both the `limit_req_zone` directives that belong in `/etc/nginx/nginx.conf` and the production server blocks installed at `/etc/nginx/sites-available/bc1q21`.

## Secrets excluded

Do not commit `/etc/bc1q21/bc1q21.env`, TLS private keys, SSH private keys, GitHub secrets, Bitcoin RPC credentials, passwords, tokens, or other secret material.
