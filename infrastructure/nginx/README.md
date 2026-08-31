# bc1q21 nginx Configuration

This directory contains the version-controlled reference for the nginx configuration used by the bc1q21 production deployment.

## Purpose

The production nginx configuration contains security and deployment controls that are important to the operation of bc1q21, including:

- Content-Security-Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- clickjacking protection
- MIME-sniffing protection
- referrer and permissions policies
- TLS configuration
- application and API routing
- API rate limiting
- cache-control rules
- server information suppression

These controls are maintained in version control so that security-relevant production configuration can be reviewed, audited, reproduced, and restored.

## Production locations

The live production configuration currently uses:

- `/etc/nginx/nginx.conf` — main nginx configuration and rate-limit zone definitions
- `/etc/nginx/sites-available/bc1q21` — bc1q21 site configuration
- `/etc/nginx/sites-enabled/bc1q21` — symlink enabling the bc1q21 site

The production server currently has no additional configuration files in `/etc/nginx/conf.d/`.

## Reference configuration

`bc1q21.conf` records the bc1q21-specific production configuration in one reviewable file.

It contains both:

1. the `limit_req_zone` directives that are installed inside the `http {}` context of `/etc/nginx/nginx.conf`; and
2. the bc1q21 `server` configuration installed at `/etc/nginx/sites-available/bc1q21`.

For that reason, `bc1q21.conf` is a reference configuration and must not be copied wholesale into `/etc/nginx/sites-enabled/`.

## Making production changes

Security-relevant nginx changes should be reviewed and committed to this repository so that the version-controlled reference remains synchronized with production.

Before applying or reloading an nginx configuration change on production, validate the configuration with:

```bash
nginx -t
```

Only reload nginx after the configuration test succeeds.

## Secrets

Private keys, passwords, API credentials, RPC credentials, environment files, and other secrets must never be committed to this directory or elsewhere in the public repository.

Certificate paths such as `/etc/letsencrypt/live/bc1q21.com/privkey.pem` may appear in the reference configuration. The private-key file itself must never be committed.
