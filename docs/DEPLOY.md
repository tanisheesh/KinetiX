# Deploying KinetiX

> **Live:** [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) · **Host:** Vercel · **Auto-deploy:** on push to `main`

For local development, see [SETUP.md](SETUP.md).

---

## 1. Architecture in production

| Piece | Runs on | Notes |
|---|---|---|
| Web app & 3D Digital Twin | Vercel | Next.js 16 static prerendered routes + Edge OG generation |
| DNS | GoDaddy | `kinetix.tanisheesh.in` → CNAME to `cname.vercel-dns.com` |

---

## 2. Environment variables

Set these in the Vercel dashboard (optional, defaults are built in). Names are in [`.env.example`](../.env.example).

| Variable | Required | Where it's set |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ❌ | Vercel → Project → Settings → Environment Variables |

---

## 3. First-time deploy (Vercel)

1. [vercel.com/new](https://vercel.com/new) → import `tanisheesh/KinetiX`
2. Framework preset: `Next.js` · Root directory: `./`
3. Click **Deploy**. Every push to `main` automatically builds and deploys to production, and every pull request gets an isolated preview URL.

---

## 4. Custom domain

`kinetix.tanisheesh.in` is wired with the setup toolkit:

```powershell
.\scripts\setup-subdomain.ps1 -Subdomain "kinetix" -Platform Vercel -VercelProject "kinetix"
```

Manual fallback: add `kinetix.tanisheesh.in` in the Vercel project domains tab, then create a GoDaddy CNAME `kinetix` → `cname.vercel-dns.com`. HTTPS certificates are provisioned automatically once DNS resolves (2–10 min).

---

## 5. Verify a deploy

- [ ] `https://kinetix.tanisheesh.in` loads with no console errors
- [ ] `/playground` renders the 60 FPS 3D Digital Twin stage, ultrasonic raycaster, and oscilloscope
- [ ] `/hardware` renders the 9-module datasheets, Slide 18 wiring schematic, and `.ino` download
- [ ] `/how-it-works` renders the mathematical equations, truth tables, and Viva defense Q&A
- [ ] `/opengraph-image` and `/sitemap.xml` resolve cleanly

---

## 6. Rollback

| Host | How |
|---|---|
| Vercel | Dashboard → Deployments → pick the last good deployment → **Promote to Production** (or `vercel rollback`) |

After rolling back, note it in a commit or PR so the next push doesn't silently re-ship the broken version.

---

## 7. Monitoring & logs

- **Logs:** Vercel → Project → Logs
- **Dependencies:** Dependabot opens weekly update PRs on Monday 06:00 IST and a maintenance report runs every Monday at 10:00 IST (see `.github/workflows/`).

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
