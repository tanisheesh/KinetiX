# Deploying KinetiX

> **Live:** [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) · **Host:** Vercel (`kinetix`) · **Auto-deploy:** on push to `main`

For local development and physical Arduino flashing, see [SETUP.md](SETUP.md).

---

## 1. Production Topology & Resource Limits

| Component | Host / Service | Region & Runtime | Configured Limits / Quotas |
|---|---|---|---|
| Web App & 3D Twin | Vercel (`kinetix`) | Global Edge CDN (`bom1` default) · Node `22.x` | Static prerendered routes + Next/OG image generation · docs-only builds ignored |
| Security Headers | Vercel Edge (`vercel.json`) | `/(.*)` route match | `nosniff`, `DENY` framing, HSTS (`2 yrs`), `Permissions-Policy`, `Referrer-Policy` |
| DNS & TLS | GoDaddy → Vercel | `kinetix.tanisheesh.in` | CNAME + automatic Vercel TLS provisioning |

---

## 2. Production Environment Variables

All core simulation and firmware features work with zero required environment secrets. Key names live in [`.env.example`](../.env.example).

| Variable | Required | Host Location | Rotation / Sensitivity |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ❌ | Vercel → Project (`kinetix`) → Settings → Environment Variables | Public — optional override (defaults to `https://kinetix.tanisheesh.in`) |

> Changing an env var does **not** update already-built static deployments — trigger a redeploy after editing env vars.

---

## 3. First-Time Deploy & Vercel Hardening

1. Connect `tanisheesh/KinetiX` in [vercel.com/new](https://vercel.com/new) (Framework preset: `Next.js`, Root directory: `./`).
2. Every push to `main` automatically deploys to production; pull requests receive isolated preview URLs.
3. Apply production security, region, and docs-only build ignore settings via the setup toolkit:

   ```powershell
   ..\setup-toolkit\scripts\setup-vercel-project.ps1 -Project "kinetix" -RepoPath . -Region "bom1" -IgnoreDocsOnlyBuilds
   ```

---

## 4. Custom Domain & Security Headers

`kinetix.tanisheesh.in` is wired via:

```powershell
..\setup-toolkit\scripts\setup-subdomain.ps1 -Subdomain "kinetix" -Platform Vercel -VercelProject "kinetix"
```

- **Manual DNS fallback:** Add `kinetix.tanisheesh.in` in Vercel → Project → Settings → Domains, then point GoDaddy CNAME `kinetix` to `cname.vercel-dns.com` (TTL `600s`; propagation `2–10 min`).
- **Security headers (`vercel.json`):** Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

---

## 5. Post-Deploy Smoke Verification

Run immediately after production deploys:

```bash
# 1. Verify all App Router & metadata endpoints return HTTP 200
for path in / /playground /hardware /how-it-works /sitemap.xml /robots.txt; do
  echo "$path -> $(curl -s -o /dev/null -w "%{http_code}" https://kinetix.tanisheesh.in$path)"
done

# 2. Verify Edge security headers from vercel.json are active
curl -sI https://kinetix.tanisheesh.in | grep -iE "x-frame-options|x-content-type-options|strict-transport-security|referrer-policy|permissions-policy"
```

- [ ] `https://kinetix.tanisheesh.in` loads cleanly on mobile (`375px`) and desktop (`1280px`) with zero console errors
- [ ] `/playground` renders the 60 Hz 3D Digital Twin stage, PiP `NOSE_CAM`, C++ Firmware Patcher, oscilloscope, and 120-sample strip chart
- [ ] `/hardware` renders the 6-subsystem datasheets, 4-fault Common Ground schematic, and `.ino` download
- [ ] `/how-it-works` renders the 5 mathematical equations, truth tables, and v2 roadmap
- [ ] `/opengraph-image` and `/sitemap.xml` return `200`

---

## 6. Rollback Procedure

| Layer | Rollback Action |
|---|---|
| **Vercel** | Vercel Dashboard → `kinetix` → Deployments → select last healthy deploy → **Promote to Production** (or `vercel rollback`) |

> Always record any manual production rollback (target commit SHA + reason) in a commit or PR so the next push to `main` does not silently re-ship the broken build.

---

## 7. Incident & Quota Runbooks

| Incident | Immediate Action |
|---|---|
| **Broken production build / WebGL runtime crash** | Promote previous healthy deploy in Vercel immediately; reproduce locally via `pnpm run typecheck && pnpm run build` and check dynamic `ssr: false` guards |
| **Security headers missing on custom domain** | Verify `vercel.json` is tracked on `main` and redeploy without cache; re-check with `curl -sI https://kinetix.tanisheesh.in` |
| **Suspected secret leak** | Revoke/rotate any leaked token at provider immediately -> scrub/rotate env var -> verify `secret-scan.yml` (Gitleaks) & GitHub Secret Scanning clear |
| **Custom domain / TLS cert failure** | Inspect Vercel Domains panel + GoDaddy CNAME `kinetix`; re-run `setup-subdomain.ps1` if CNAME drifted |

---

## 8. Monitoring & Automated Maintenance

- **Logs & Analytics:** Vercel → `kinetix` → Logs & Deployments
- **Automated Hygiene:** Renovate (`Yantra [bot]` via `renovate.yml` + `dependency-auto-merge.yml`), CodeQL (`codeql.yml`), Gitleaks (`secret-scan.yml`), Dependency Review (`dependency-review.yml`), and Monday 10:00 IST Maintenance Report (`maintenance-report.yml`) run via `.github/workflows/`.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
