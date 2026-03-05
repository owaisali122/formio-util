## Using the `formIoBuilder` Package (Consumer Guide)

This guide explains how **you**, as a consumer, can get access to, install, and use the private `formIoBuilder` package hosted on **GitHub Packages**.

The package you will install is:

- **Registry package name**: `@owaisali122/kolea-cms-formio-builder`
- **Recommended local dependency name**: `formIoBuilder`

---

## 1. Getting access from the repository owner

Before you can use the package, the repository owner must give you access.

- The package lives under the GitHub account `owaisali122`.
- To use it, you need:
  - Access to the **GitHub repository** that owns the package.
  - Permission to read packages for that account.

From your perspective as a consumer:

- If you cannot see the repository or package, ask the owner to:
  - Add you as a **collaborator** on the repository, or
  - Add you to the **GitHub organization/team** that has access to the repository.

Once the owner has given you access, continue with the steps below.

---

## 2. Prerequisites

- You must have:
  - **Node.js** and a package manager installed:
    - `pnpm` (recommended) or `npm`.
- You must be able to log in to GitHub in a browser using the account that was granted access.

---

## 3. Generate a GitHub Personal Access Token (PAT)

You need a **GitHub token** with permission to read private packages.

### 3.1 Create a classic token (recommended, simplest)

1. Sign in to GitHub.
2. Open: **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
3. Click **“Generate new token (classic)”**.
4. Fill in:
   - **Note**: e.g. `formIoBuilder-read-packages`.
   - **Expiration**: choose a duration (e.g. 90 days).
5. Under **Scopes**, check:
   - `repo`
   - `read:packages`
6. Click **Generate token**.
7. Copy the generated token (starts with `ghp_...`).  
   - **You will not see it again**, so keep it safe.

> If your organization prefers fine‑grained tokens instead, you can use one with at least **Account → Packages: Read** and repository access to the project that owns the package.

---

## 4. Configure access to GitHub Packages

You’ll configure an `.npmrc` file so your package manager knows how to authenticate.

You can do this **per project** (recommended) or **globally**.

### 4.1 Project‑level `.npmrc` (preferred)

In your project folder (for example `C:\Projects\my-app`):

1. Create a file named `.npmrc` (if it does not exist).
2. Add these lines:

```ini
@owaisali122:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_YOUR_TOKEN_HERE
```

Replace `ghp_YOUR_TOKEN_HERE` with the token you generated.

> Do **not** commit this file to git if you don’t want your token stored in the repository.

---

## 5. Add the dependency to your project

You can install the package **directly by its registry name** or keep the familiar name `formIoBuilder` using an alias.

### 5.1 Using `pnpm` (recommended)

From your project folder:

```bash
pnpm add formIoBuilder@npm:@owaisali122/kolea-cms-formio-builder@^1.0.0
```

This:

- Installs `@owaisali122/kolea-cms-formio-builder` from GitHub Packages.
- Records the dependency in `package.json` as:

```json
"dependencies": {
  "formIoBuilder": "npm:@owaisali122/kolea-cms-formio-builder@^1.0.0"
}
```

You can now run:

```bash
pnpm install
```

and `formIoBuilder` will be restored like any other dependency.

### 5.2 Using `npm`

If you prefer `npm` and your version works correctly with GitHub Packages:

1. Add the dependency entry yourself in `package.json`:

```json
"dependencies": {
  "formIoBuilder": "npm:@owaisali122/kolea-cms-formio-builder@^1.0.0"
}
```

2. Then run:

```bash
npm install
```

If your `npm` version crashes with an internal error, use `pnpm` as shown above or upgrade `npm` to a recent version.

---

## 6. Using the package in your code

Once installed, you import and use it like a normal package. For example (TypeScript/React):

```ts
import { FormRenderer } from 'formIoBuilder';
```

The exact exports depend on how the library is structured, but from your perspective it behaves like any other installed dependency.

---

## 7. Updating to a newer version

When a new version is published (for example `1.1.0`):

1. Update your `package.json` version range if needed, for example:

```json
"formIoBuilder": "npm:@owaisali122/kolea-cms-formio-builder@^1.1.0"
```

2. Run your package manager:

```bash
pnpm install
# or
npm install
```

---

## 8. Common issues and fixes

- **“Access token expired or revoked”**  
  - Generate a **new** token (Section 2) and update it in your `.npmrc`.

- **401 / 403 errors when installing**  
  - Check that `.npmrc` is in the **project root** and contains:
    - Correct user scope: `@owaisali122`
    - Correct registry URL: `https://npm.pkg.github.com`
    - A **valid** token with `read:packages` and `repo`.

- **Multiple `.npmrc` files**  
  - If you also have `C:\Users\<you>\.npmrc`, make sure it doesn’t contain old/invalid lines for `npm.pkg.github.com`, or update them to match your project `.npmrc`.

