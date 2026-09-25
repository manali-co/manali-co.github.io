# Finishing setup

Everything in code is done. These are the account-side steps that need the owner's login. Each is a few minutes; in this order they take about half an hour.

## 1. Azure: let the API repo deploy

The service principal WSWW already uses (its client id is the repo variable `AZURE_CLIENT_ID`) needs one more federated credential for the new repo, and the repo needs two secrets. Variables are already set.

```sh
APP_ID=$(gh variable get AZURE_CLIENT_ID -R manali-co/manali-api)
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "manali-api-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:manali-co/manali-api:environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

API_KEY=$(openssl rand -hex 24); TOKEN_SECRET=$(openssl rand -hex 32)
gh secret set MANALI_API_KEY      -R manali-co/manali-api -b "$API_KEY"
gh secret set MANALI_TOKEN_SECRET -R manali-co/manali-api -b "$TOKEN_SECRET"
gh secret set RESEND_API_KEY      -R manali-co/manali-api -b "re_..."     # from step 3; can wait
echo "API_KEY=$API_KEY"   # you'll paste this into Vercel in step 4
gh workflow run deploy.yml -R manali-co/manali-api
```

The deploy creates `rg-manali-dev` (Flex Consumption function app + one storage account) and reports to `wsww-dev-appi`. The API URL is the workflow's `apiUrl` output, or `https://manali-dev-api.azurewebsites.net/api`.

## 2. Clerk: the admin login

1. clerk.com → Create application → name "manali apps" → enable **GitHub** as the only sign-in method.
2. Copy the publishable and secret keys for step 4.
3. Under Paths, set Sign-in URL to `/sign-in`.

## 3. Resend: the emails

1. resend.com → Domains → add your sending domain and the DNS records it shows (SPF, DKIM).
2. API Keys → create one with sending access → `gh secret set RESEND_API_KEY -R manali-co/manali-api -b "re_..."`.
3. Set `MANALI_MAIL_FROM` in `infra/main.bicep` parameters (or the Function App settings) to `manali apps <hello@yourdomain>`.

Until this is done the API logs emails instead of sending them; subscribing still works, confirmation just never arrives.

## 4. Vercel: the site

1. vercel.com → Add New → Project → import `manali-co/manali-co.github.io`. Framework: Next.js. Root: `/`.
2. Environment variables (Production + Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | the Vercel URL, or your domain later |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk |
| `CLERK_SECRET_KEY` | from Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `ADMIN_EMAILS` | the email on your GitHub account |
| `API_BASE_URL` | `https://manali-dev-api.azurewebsites.net/api` |
| `API_KEY` | the `API_KEY` from step 1 |
| `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING` | `az monitor app-insights component show --app wsww-dev-appi -g rg-wsww-dev --query connectionString -o tsv` |
| `NEXT_PUBLIC_OWNER_LINKEDIN` | your LinkedIn URL (author line shows the glyph once set) |
| `NEXT_PUBLIC_COFFEE_URL` | Ko-fi or GitHub Sponsors link (footer button appears once set) |

3. Deploy. Then update `MANALI_SITE_URL` on the Function App (and `SITE_URL` in the API repo variables) to the real site URL so email links point at it.

## 5. giscus: comments and reactions

Install the giscus GitHub App on the site repo: https://github.com/apps/giscus/installations/new → select `manali-co/manali-co.github.io`. Discussions are already enabled and the ids are in `src/lib/site.ts`.

## 6. Coffee

Create a Ko-fi page (ko-fi.com) or enrol the org in GitHub Sponsors, then set `NEXT_PUBLIC_COFFEE_URL`.

## 7. Branch protection (optional, blocked for the agent)

```sh
gh auth refresh -h github.com -s admin:org,delete_repo
../manali/scripts/protect-branches.sh
```

The `delete_repo` scope also lets you delete and recreate `manali-co/.github` if you want the replaced first commit gone from GitHub's cache entirely (history is already rewritten).
