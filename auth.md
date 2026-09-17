# auth.md — FocusPaw

You are an agent. **FocusPaw** (https://focus-paw.luongnv.com) is a static,
public marketing and documentation site for the FocusPaw Chrome extension —
a privacy-first, local-only focus tracker. Everything readable on this origin
is available **anonymously**: no account, credential, or token is required to
GET any public page or `/.well-known/` document.

## Audience

This document is written for autonomous agents and LLM-driven clients that
want to discover how (or whether) to authenticate with this service.

## Registration

Because every resource here is public, registration is **optional** and only
the `anonymous` identity type applies — there is no user identity to assert
and nothing a credential would unlock. If a future protected surface appears,
it will be advertised through the discovery chain below rather than through
this document alone.

- **Supported registration methods:** `anonymous` only.
- **Registration endpoint (nominal):** `POST /agent/identity` — declared in
  the `agent_auth` block of the Authorization Server metadata so the chain
  resolves end-to-end; the endpoint is not live because no resource requires
  it.
- **Claim endpoint (nominal):** `POST /agent/identity/claim`.

## Discovery chain

1. Protected Resource Metadata (RFC 9728):
   `GET /.well-known/oauth-protected-resource` — names the resource
   identifier and `authorization_servers`.
2. Authorization Server metadata (RFC 8414):
   `GET /.well-known/oauth-authorization-server` — carries the `agent_auth`
   block (`skill`, `register_uri`, `identity_types_supported`). OIDC clients
   can use `GET /.well-known/openid-configuration` instead.
3. JWKS: `GET /.well-known/jwks.json` — an empty key set; this issuer signs
   no tokens today.

## Credential use

If a credential is ever issued, send it as `Authorization: Bearer <token>`
(`bearer_methods_supported: ["header"]` in the PRM document) and scope it to
`site.read`. Tokens are revocable via `POST /oauth2/revoke` (RFC 7009).

## Scopes

| Scope       | Description                                    |
| ----------- | ---------------------------------------------- |
| `site.read` | Read-only access to public site resources      |

## Policies and contact

- Content signals (AI usage preferences): `/robots.txt` —
  `ai-train=no, search=yes, ai-input=no`.
- Privacy policy: `/privacy` and
  https://github.com/luongnv89/focus-paw/blob/main/PRIVACY.md
- Source, issues, and integration questions:
  https://github.com/luongnv89/focus-paw
