# TokPulse — Run from `packages/` (Shorthand Ops)

**Goal:** ship new builds side‑by‑side under `packages/<drop>/`, test safely, then promote one to **production** by pointing `packages/.current` at it.

---

## 0) Repo shape (one time)
```
/incoming/                     # drop ZIPs here and push
/packages/
  .current                     # contains: packages/<drop-name>
.github/workflows/
  tokpulse-unbox-packages.yml  # unboxes ZIPs → packages/<drop>/
  tokpulse-run-from-packages.yml
  tokpulse-promote.yml
netlify.toml                   # optional (Netlify)
```
> If you don’t see the workflows, put them under **.github/workflows** (lower‑case).

---

## 1) Ship a new build
1. Add ZIP to `incoming/` and push.
2. Unboxer action creates `packages/<drop-name>/`.

---

## 2) Test the new package (CI runner)
- GitHub → **Actions → TokPulse Run (prefer .current; fallback latest)** → **Run workflow**.  
- It runs from `packages/.current` if present, else **latest** folder.

> To force‑run against a specific package, temporarily write its path into `.current` or run your app locally from that folder.

---

## 3) Promote to production
- GitHub → **Actions → TokPulse Promote**  
  - **package_dir**: `packages/<drop-name>`  
  - **deploy_prod**: `true`
- This will:
  1) write `packages/.current` with your choice, commit & push
  2) call deploy hooks (Vercel/Netlify) if configured

**Secrets required (repo → Settings → Secrets → Actions):**
- `VERCEL_HOOK_PROD` (optional) — Production Deploy Hook URL
- `NETLIFY_HOOK_PROD` (optional) — Build Hook URL

---

## 4) Vercel (recommended setup)
**Create 2 projects:**
- **tokpulse-prod**  
  - Root Directory: `packages/current`  
  - Install: `npm ci`  
  - Build: `npm run build`  
  - Output: `dist` (or your app’s output)  
  - Create **Deploy Hook** → save in repo secret `VERCEL_HOOK_PROD`

- **tokpulse-canary** (optional)  
  - Root Directory: `packages/next` *or* a specific `packages/<drop>`

> Promotion just flips `packages/.current`; Vercel prod redeploys from `packages/current` automatically via the hook.

---

## 5) Netlify (alternative or in parallel)
Use the provided **`netlify.toml`**:
```toml
[build]
base = "packages/current"
command = "npm ci && npm run build"
publish = "dist"

[context.deploy-preview]
base = "packages/next"

[context.branch-deploy]
base = "packages/next"
```
- Create a **Build Hook** → save in secret `NETLIFY_HOOK_PROD`.

---

## 6) Google Apps Script (optional orchestration)
**Script Properties** (File → Project properties → Script properties)
- `GITHUB_REPO` = `owner/repo` (e.g., `shardie-github/Hardonia-tokpulse`)
- `GITHUB_TOKEN` (classic with `repo` scope), optional

**Dispatch the runner:**
```javascript
function runTokpulseWorkflow(){
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  const repo  = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO');
  const url   = `https://api.github.com/repos/${repo}/actions/workflows/tokpulse-run-from-packages.yml/dispatches`;
  const payload = { ref: 'main' };
  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' },
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```
Create a time‑based trigger if wanted.

**Read the active package:**
```javascript
function getCurrentPackagePath(){
  const repo = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO');
  const res  = UrlFetchApp.fetch(`https://api.github.com/repos/${repo}/contents/packages/.current`);
  const j    = JSON.parse(res.getContentText());
  return Utilities.newBlob(Utilities.base64Decode(j.content)).getDataAsString().trim();
}
```

---

## 7) Rollback
Run **TokPulse Promote** again, select the previous `packages/<drop>` → prod flips back instantly.

---

## 8) Housekeeping (optional)
- Delete old `packages/<drop>` folders you no longer need.
- Keep a CHANGELOG entry per promoted drop.
