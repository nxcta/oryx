# Security policy — SecuBot

## Reporting a vulnerability

Use a **private** channel defined by your organization (security@… / bug bounty program). Do not open public issues for exploit details until coordinated disclosure completes.

## Credential handling

- Never commit Discord bot tokens, OAuth secrets, database passwords, JWT signing keys, or license pepper material to git.
- If a credential is exposed in chat, tickets, or logs: **rotate immediately**, invalidate sessions, and review audit logs for the exposure window.

## Supported versions

Security fixes are applied on the active release branch maintained by the project owners.
