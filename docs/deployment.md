# Deployment

The site is published to GitHub Pages at **https://open-paleo.org** by
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## When the site is rebuilt

| Trigger | Data it builds against | Why |
|---------|------------------------|-----|
| Push to `main` | `main` of open-paleo/data | The site's code or design changed |
| `repository_dispatch` of type `data-updated` | The data commit named in the payload (`client_payload.sha`) | The data repository published new output; the exact commit avoids reading a `main` that is still being served stale |
| Manual run (Actions tab, "Run workflow") | `main` of open-paleo/data | Any time |
| Nightly at 06:17 UTC | `main` of open-paleo/data | Catches a missed `data-updated` notification |

Each run installs dependencies, runs the tests, builds the site with `SITE_URL=https://open-paleo.org`
and `SITE_BASE=/` (which turn on canonical addresses, the sitemap and the sitemap line in
`robots.txt`), indexes it with Pagefind, and publishes it. A run whose tests fail publishes
nothing, so the live site keeps its last good build. Only one deployment runs at a time.

## One-time setup

These steps are done once, in GitHub settings and at the domain registrar. They are recorded
here so the setup can be checked or repeated.

### 1. Publish from GitHub Actions

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. This creates the
`github-pages` environment the workflow deploys to.

### 2. Verify the domain for the organization

In the organization's **Settings → Pages → Verified domains**, add `open-paleo.org` and create the
TXT record GitHub shows. GitHub recommends verifying before adding the domain to a repository: it
stops anyone else from claiming the domain for their own Pages site.

### 3. Point open-paleo.org at GitHub Pages

At the DNS provider for `open-paleo.org`:

| Name | Type | Value |
|------|------|-------|
| `@` (apex) | `A` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `@` (apex) | `AAAA` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www` | `CNAME` | `open-paleo.github.io` |

These are the addresses in GitHub's
[custom domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site);
check them there before relying on this table.

### 4. Set the custom domain

In the repository's **Settings → Pages**, set **Custom domain** to `open-paleo.org`, wait for the
DNS check to pass, then turn on **Enforce HTTPS**. GitHub redirects `www.open-paleo.org` to
`open-paleo.org` on its own once both records exist.

### 5. Redirect openpaleo.org

A GitHub Pages site takes a single custom domain (with its `www` form), so `openpaleo.org` cannot
be attached to it. Redirect it instead, at its DNS provider or registrar, with a permanent (301)
redirect to `https://open-paleo.org`, keeping the path (`openpaleo.org/genus/tyrannosaurus/` to
`open-paleo.org/genus/tyrannosaurus/`). Most registrars offer this as "URL forwarding"; on
Cloudflare it is a redirect rule.

Leave the domain's mail records (`MX`, and any `TXT` records for mail) as they are: the redirect
is for the web only. The code of conduct's contact address, `codeofconduct@openpaleo.org`, keeps
working.

### 6. Rebuild when the data changes

The data repository's build workflow sends a `data-updated` notification to this repository after
it publishes new output, the same way it notifies open-paleo/corpus when the bibliography
changes. GitHub's built-in token cannot notify another repository, so the step uses a
fine-grained personal access token stored in the data repository as the secret
`WEB_DISPATCH_TOKEN`, set up like the existing `CORPUS_DISPATCH_TOKEN` but scoped to
`open-paleo/web`. The step notifies only when the build changed `dist/`, not when it changed
only the spell-check dictionaries. The step is on the data repository's `main` (commit
`bc9fb9105`).

The token needs **Contents: Read and write** on `open-paleo/web` and nothing else: GitHub's
[permissions reference for fine-grained tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
lists that permission for `POST /repos/{owner}/{repo}/dispatches`, and Metadata: Read is added
automatically. To create it, under the token owner's **Settings → Developer settings →
Fine-grained tokens**, choose `open-paleo` as the resource owner, **Only select repositories**
with `open-paleo/web`, and that one permission. Store it in the data repository with
`gh secret set WEB_DISPATCH_TOKEN -R open-paleo/data`, or under the data repository's
**Settings → Secrets and variables → Actions**.

Without the secret, or once the token expires, the step fails without failing the data build,
and the site falls back to its nightly rebuild, so data changes appear within a day.

## Checking a deployment

- The run's summary in the Actions tab links to the published site.
- `https://open-paleo.org/robots.txt` names the sitemap, and every page's source has a
  `<link rel="canonical">` with an `https://open-paleo.org/` address.
- `https://open-paleo.org/search/?q=Tyrannosaurus` returns results, which confirms the Pagefind
  index loaded from the published site.
- A missing address, such as `https://open-paleo.org/genus/nonexistent/`, shows the site's
  "Page not found" page.
