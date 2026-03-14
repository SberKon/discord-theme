# TikTok Embed Fix

A Vendetta/Bunny plugin for iOS Discord clients (Ketutweak, etc.) that fixes TikTok embeds by routing them through [fixtiktok.com](https://fixtiktok.com).

## What it does

- Replaces TikTok embed sources with `fixtiktok.com` equivalents
- **Original links stay untouched** — only the embed renderer is patched
- Works on messages from **you and other users**
- Purely visual — no messages are modified or sent

## Supported URL formats

| Original | Fixed |
|---|---|
| `https://vt.tiktok.com/ZSuPgwwBC/` | `https://fixtiktok.com/ZSuPgwwBC/` |
| `https://vm.tiktok.com/ZSuSru9CN/` | `https://fixtiktok.com/ZSuSru9CN/` |
| `https://www.tiktok.com/@user/video/123` | `https://fixtiktok.com/@user/video/123` |
| `https://tiktok.com/@user/video/123` | `https://fixtiktok.com/@user/video/123` |

## Install

After deploying to GitHub Pages, add in Vendetta/Bunny:

```
https://YOUR_GITHUB_USERNAME.github.io/tiktok-embed-fix/tiktok-embed-fix
```

## Build locally

```bash
pnpm install
pnpm build
```

## License

CC0
