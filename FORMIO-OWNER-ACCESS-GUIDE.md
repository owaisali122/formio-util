## Owner Guide: Granting Team Access to `formIoBuilder`

This guide explains what the **repository/package owner** needs to do so that teammates can install and use the private `formIoBuilder` package from GitHub Packages.

The package that has been published is:

- **Registry package name**: `@owaisali122/kolea-cms-formio-builder`

---

## 1. Ensure repository access for your team

Teammates must be able to see the repository that owns the package.

### 1.1 If the repo is under your personal account

1. Go to the repository page, for example:  
   `https://github.com/owaisali122/formio-util`
2. Click **Settings** → **Collaborators** (or **Collaborators & teams**).
3. Under **Manage access**, click **Add people**.
4. Search for your teammate’s GitHub username.
5. Add them with at least **Read** access (or higher if they will contribute code).

This automatically gives them read access to packages published from that repository.

### 1.2 If the repo is under an organization

1. Go to your organization on GitHub.
2. Add teammates to a **team** that has access to the repository.
3. In the repo’s **Settings → Collaborators & teams**, assign that team **Read** or higher permission.

Anyone in that team will then be able to read the repository and its packages.

---

## 2. Decide how teammates should authenticate

Each teammate needs **their own** GitHub token; do **not** share your personal token.

You have two common options:

- **Option A – Let teammates create their own classic PATs**  
  - Suitable when teammates work from their own machines.
- **Option B – Provide a shared machine/CI token**  
  - Suitable for CI systems or shared dev environments.

You can mix both: personal tokens for developers, machine tokens for CI.

---

## 3. Recommended token scopes

### 3.1 For individual developers (classic PAT)

Ask teammates to create tokens with:

- **Scopes**:
  - `repo`
  - `read:packages`

This is enough for them to:

- Clone and pull the repository (if private).
- Install packages from GitHub Packages.

### 3.2 For CI / shared environments

Create a **machine token** under your account or a service account with:

- `repo`
- `read:packages`
- Optionally `write:packages` if CI will publish new versions.

Store this token as a **secret** in your CI system (for example `GH_PACKAGES_TOKEN`).

---

## 4. Example `.npmrc` configuration for consumers

Share the following snippet with your team (they should use their **own** token):

```ini
@owaisali122:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_THEIR_PERSONAL_TOKEN_HERE
```

Place this in either:

- The **project root** (per‑project `.npmrc`), or
- Their **user home** `.npmrc` (applies to all projects).

Remind them **not to commit** `.npmrc` files containing real tokens.

---

## 5. CI pipeline example (GitHub Actions)

Below is a minimal example of how to configure GitHub Actions to install the package using a repository or organization secret:

```yaml
name: CI

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Configure npm for GitHub Packages
        run: |
          cat <<'EOF' > .npmrc
          @owaisali122:registry=https://npm.pkg.github.com
          //npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
          EOF
        env:
          GH_PACKAGES_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}

      - run: pnpm install
      - run: pnpm test
```

To use this:

1. Create a token with `repo` + `read:packages` (and `write:packages` if publishing).
2. Add it as a **repository secret** named `GH_PACKAGES_TOKEN`.
3. Commit the workflow file to `.github/workflows/ci.yml`.

---

## 6. What to tell your team

When onboarding a new teammate, share the following points:

1. They have been granted access to the repository that owns `@owaisali122/kolea-cms-formio-builder`.
2. They should follow the **consumer guide** (`FORMIO-CONSUMER-INSTALL-GUIDE.md`) to:
   - Create their own PAT with `repo` + `read:packages`.
   - Configure `.npmrc` with their token.
   - Install `formIoBuilder` using `pnpm add formIoBuilder@npm:@owaisali122/kolea-cms-formio-builder@^1.0.0`.

This keeps ownership and security with you while making it easy for others to consume the package.

