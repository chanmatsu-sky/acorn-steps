# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in acorn-steps, **please do not open a public issue**.

Instead, report it privately via either:

1. **GitHub Security Advisories** (preferred): https://github.com/chanmatsu-sky/acorn-steps/security/advisories/new
2. **Email:** matsumoto.satoru@aainc.co.jp with subject line `[acorn-steps security]`

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept welcome)
- Affected versions / commits
- Any suggested mitigation

## What to expect

- **Acknowledgment** within 72 hours
- **Initial assessment** within 7 days
- Coordinated disclosure: we aim to publish a fix and advisory within 90 days
- Credit in the advisory if you wish (or anonymous, your choice)

## Supported versions

acorn-steps is pre-1.0. Only the `main` branch and the latest tagged release receive security fixes.

## Out of scope

- Issues that require physical access to a user's device
- Social engineering attacks against contributors
- Denial of service from unauthenticated traffic floods (use a CDN / WAF in front)
- Vulnerabilities in third-party dependencies — please report those to the upstream project; we will track via Dependabot/Renovate
