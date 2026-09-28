# Finishing setup

Everything in code is done. These are the account-side steps that need the owner's login. Each is a few minutes; in this order they take about half an hour.

## 1. Azure: let the API repo deploy

The service principal WSWW already uses (its client id is the repo variable `AZURE_CLIENT_ID`) is scoped to the WSWW resource groups. It needs the new resource group, rights on it, and a federated credential for the new repo; the repo needs two secrets. Variables are already set.

```sh
az login && az account set -s manali
APP_ID=$(gh variable get AZURE_CLIENT_ID -R manali-co/manali-api)
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
SUB=$(az account show --query id -o tsv)

# the resource group, and the deployer's rights on it (Bicep also assigns roles, hence UAA)
az group create -n rg-manali-dev -l eastus2
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "/subscriptions/$SUB/resourceGroups/rg-manali-dev"
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role "User Access Administrator" --scope "/subscriptions/$SUB/resourceGroups/rg-manali-dev"

# let GitHub Actions in the new repo sign in as that principal
# the org's OIDC tokens carry GitHub ids in the subject ("use_immutable_subject"), so the
# credential must match that exact form; the plain "repo:manali-co/manali-api:..." form is ignored
SUBJECT=$(gh api repos/manali-co/manali-api/actions/oidc/customization/sub --jq .sub_claim_prefix):environment:dev
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"manali-api-dev-id\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"$SUBJECT\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

API_KEY=$(openssl rand -hex 24); TOKEN_SECRET=$(openssl rand -hex 32)
ADMIN_KEY=$(openssl rand -hex 24)
gh secret set MANALI_API_KEY      -R manali-co/manali-api -b "$API_KEY"
gh secret set MANALI_ADMIN_KEY    -R manali-co/manali-api -b "$ADMIN_KEY"
gh secret set MANALI_TOKEN_SECRET -R manali-co/manali-api -b "$TOKEN_SECRET"
gh secret set RESEND_API_KEY      -R manali-co/manali-api -b "re_..."     # from step 3; can wait
echo "API_KEY=$API_KEY ADMIN_KEY=$ADMIN_KEY"   # you'll paste these into Vercel in step 4
gh workflow run deploy.yml -R manali-co/manali-api && sleep 5 && gh run watch -R manali-co/manali-api
curl https://manali-dev-api.azurewebsites.net/api/healthz
```

The deploy provisions `rg-manali-dev` (Flex Consumption function app + one storage account) and reports to `wsww-dev-appi`. The API URL is `https://manali-dev-api.azurewebsites.net/api`.

## 1b. Azure prod: done (2026-09-28)

Prod runs in the `manali-prod` subscription: `rg-manali-prod` with `manali-prod-api`, its own storage and its own Application Insights (`manali-prod-appi`, created by Bicep). The GitHub environment `prod` holds `AZURE_SUBSCRIPTION_ID`, `SITE_URL` and the four secrets; the deployer has Contributor + User Access Administrator on the group and a federated credential for `environment:prod`. Vercel production (manali.page) uses the prod API and prod keys; preview deployments use dev.

Later prod deploys: publish a GitHub release (`gh release create v1.0.0 -R manali-co/manali-api --generate-notes`) or run the workflow with `environment=prod`. Pushes to main only touch dev. An empty `rg-manali-prod` was created earlier in the `manali` subscription by mistake; delete it in the portal whenever.

## 1c. The domain: manali.page

Everything below assumes the site lives at `https://manali.page`. Buy it first (Porkbun: https://porkbun.com/checkout?q=manali.page, about $11 a year, flat), then:

1. **Attach it to Vercel.** In the site repo: `vercel domains add manali.page` and `vercel domains add www.manali.page`. Vercel prints the DNS records it wants (an `A` record for the apex and a `CNAME` for `www`). Add them in Porkbun under DNS. `.page` is HTTPS-only; Vercel issues the certificate itself once DNS resolves.
2. **Make it the canonical URL.** In Vercel: `vercel env rm NEXT_PUBLIC_SITE_URL production -y; echo "https://manali.page" | vercel env add NEXT_PUBLIC_SITE_URL production; vercel --prod`. In the API repo: `gh variable set SITE_URL -R manali-co/manali-api -b "https://manali.page"` (and the same with `-e prod`), then run the deploy workflow. Change `NEXT_PUBLIC_SITE_URL` in `.github/workflows/pages.yml` too so the Pages mirror links there.
3. **Resend.** Domains → Add `manali.page`, paste its records into Porkbun DNS, wait for "Verified". The sender is already `hello@manali.page`.
4. **Clerk production.** Create a production instance for the app, set its domain to `manali.page`, add the DNS records Clerk shows, then swap the `pk_live_` / `sk_live_` keys into Vercel the same way as the test keys. That removes the "Development mode" badge.

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
| `NEXT_PUBLIC_SITE_URL` | the Vercel URL, or your domain later. This is the canonical host: the Pages build also links here. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk |
| `CLERK_SECRET_KEY` | from Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `ADMIN_EMAILS` | the email on your GitHub account |
| `API_BASE_URL` | `https://manali-dev-api.azurewebsites.net/api` |
| `API_KEY` | the `API_KEY` from step 1 |
| `ADMIN_API_KEY` | the `ADMIN_KEY` from step 1. **Production only**: it unlocks the subscriber list and the announce button, so preview deployments must not have it. |
| `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING` | `az monitor app-insights component show --app wsww-dev-appi -g rg-wsww-dev --query connectionString -o tsv` |


Clerk switches on only when the publishable key looks real (`pk_test_…` or `pk_live_…`). A placeholder is ignored rather than crashing the site, so replace it once you have the keys:

```sh
vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production -y && echo "pk_live_..." | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env rm CLERK_SECRET_KEY production -y && echo "sk_live_..." | vercel env add CLERK_SECRET_KEY production
vercel --prod
```

3. Deploy. Then update `MANALI_SITE_URL` on the Function App (and `SITE_URL` in the API repo variables) to the real site URL so email links point at it.

## 5. giscus: comments and reactions

Almost done: Discussions are enabled and the ids are in `src/lib/site.ts`. The app install got as far as GitHub's passkey prompt, which needs you: https://github.com/apps/giscus/installations/new → manali-co → Only select repositories → `manali-co.github.io` → Install → confirm with your passkey.

## 6. Coffee

Done: the footer links to https://ko-fi.com/manaliapps by default. `NEXT_PUBLIC_COFFEE_URL` overrides it.

## 7. Branch protection (optional, blocked for the agent)

```sh
gh auth refresh -h github.com -s admin:org,delete_repo
../manali/scripts/protect-branches.sh
```

The `delete_repo` scope also lets you delete and recreate `manali-co/.github` if you want the replaced first commit gone from GitHub's cache entirely (history is already rewritten).
