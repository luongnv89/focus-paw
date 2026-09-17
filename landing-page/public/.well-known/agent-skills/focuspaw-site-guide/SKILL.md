---
name: focuspaw-site-guide
description: Discover FocusPaw's machine-readable resources — ARD manifest, A2A agent card, MCP server card, API catalog, OAuth/OIDC discovery docs, auth.md and llms.txt — and the rules for using them.
license: MIT
---

# FocusPaw Site Guide

FocusPaw (https://focus-paw.luongnv.com) is a privacy-first Chrome extension that
tracks focus-switching habits. This site is a static landing page; it exposes no
authenticated APIs and collects no telemetry.

## Machine-readable resources

| Resource                 | URL                                     |
| ------------------------ | --------------------------------------- |
| ARD manifest             | /.well-known/ai-catalog.json            |
| A2A agent card           | /.well-known/agent-card.json            |
| Agent skills index       | /.well-known/agent-skills/index.json    |
| MCP server card          | /.well-known/mcp/server-card.json       |
| API catalog (RFC 9727)   | /.well-known/api-catalog                |
| OpenAPI description      | /.well-known/openapi.json               |
| OAuth AS metadata        | /.well-known/oauth-authorization-server |
| OIDC configuration       | /.well-known/openid-configuration       |
| Protected resource (PRM) | /.well-known/oauth-protected-resource   |
| Agent registration guide | /auth.md                                |
| llms.txt                 | /llms.txt                               |
| Sitemap                  | /sitemap.xml                            |

## Usage

1. Fetch `/.well-known/ai-catalog.json` for the canonical list of agentic
   resources published by this origin.
2. All endpoints are anonymous HTTPS GET; no credentials, cookies or telemetry.
3. The content signals in `/robots.txt` apply: `ai-train=no`, `search=yes`,
   `ai-input=no`.
