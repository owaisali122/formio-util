# Kolea Shared Package

A shared npm package providing custom Form.io components, builder configuration, and form rendering utilities for Payload CMS and other consuming applications.

## Overview

**kolea-shared-package** (`@owaisali122/kolea-shared-package`) is a centralized package that encapsulates all Form.io component definitions, the component registry, builder configuration, and the `FormRenderer` component. This eliminates duplication across projects and ensures consistent form behavior across your applications.

### What's Included

- **Custom Form.io Components**
  - **App Detail Ref** — Reference and embed form data from other applications
  - **Searchable Dropdown** — Server-side dropdown with dynamic data loading
  - **SSN** — Social Security Number field with validation
  
- **Builder & Renderer**
  - `FormBuilder` — React component for embedding Form.io designer
  - `FormRenderer` — React component for rendering forms
  - Customizable builder configuration with sidebar components
  
- **Utilities & Plugins**
  - Component registry management
  - Bootstrap CSS isolation via `BootstrapProvider`
  - Form schema utilities and transformations
  - Plugin system for extensibility

## Installation

### Prerequisites

Before installing, ensure your project has:

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- **React** 18+
- **React DOM** 18+
- **Form.io.js** ^4.21.0
- **Bootstrap** 5+ (for Form.io styling)

### Install from npm

```bash
pnpm add kolea-shared-package
```

If using GitHub Packages, configure your `.npmrc`:

```
@owaisali122:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install:

```bash
pnpm add @owaisali122/kolea-shared-package
```

## Quick Start

### 1. Set Up Bootstrap Provider

Wrap your application with `BootstrapProvider` to isolate Bootstrap and Form.io CSS:

```typescript
import { BootstrapProvider } from 'kolea-shared-package'

export default function App() {
  return (
    <BootstrapProvider 
      bootstrapCssUrl="/api/bootstrap-css"
      formioCssUrl="/api/formio-css"
    >
      {/* Your app content */}
    </BootstrapProvider>
  )
}
```

### 2. Render a Form

Use `FormRenderer` to display forms:

```typescript
import { FormRenderer } from 'kolea-shared-package'

export default function MyFormPage() {
  const formSchema = {
    display: 'form',
    components: [
      {
        type: 'textfield',
        key: 'firstName',
        label: 'First Name',
        placeholder: 'Enter your first name',
      },
    ],
  }

  return (
    <FormRenderer 
      schema={formSchema}
      onSubmit={(data) => console.log('Form submitted:', data)}
    />
  )
}
```

### 3. Set Up Form Builder (Payload CMS)

In your Payload CMS project, create a custom field component:

```typescript
import { FieldBase } from 'payload/fields'
import FormBuilderField from 'path/to/FormBuilderField'

export const formBuilderField = {
  name: 'formSchema',
  type: 'custom',
  component: FormBuilderField,
}
```

## Configuration

### Configure Package Behavior

Use the `configure()` function to set default options:

```typescript
import { configure } from 'kolea-shared-package'

configure({
  formsListUrl: 'https://your-cms.com/api/forms',
  baseUrl: 'https://your-cms.com',
  // Additional options...
})
```

### Builder Configuration

Customize the Form.io builder sidebar:

```typescript
import { getBuilderConfig } from 'kolea-shared-package'

const builderConfig = getBuilderConfig({
  // Custom builder options
})
```

## Custom Components

### App Detail Ref

Reference data from other applications within your forms:

```typescript
import { setupAppDetailRefFormDropdown } from 'kolea-shared-package'

setupAppDetailRefFormDropdown({
  formKey: 'applicantForm',
  componentKey: 'applicantRef',
  appDetailRefApiUrl: '/api/app-details',
})
```

### Searchable Dropdown

Enable dynamic server-side dropdowns:

```typescript
const dropdownComponent = {
  type: 'searchable-dropdown',
  key: 'businessType',
  label: 'Business Type',
  dataSourceUrl: '/api/business-types',
}
```

### SSN Field

Use the SSN component for secure social security number input:

```typescript
const ssnComponent = {
  type: 'ssn',
  key: 'ssn',
  label: 'Social Security Number',
  mask: '###-##-####',
}
```

## Package Exports

The package provides multiple export paths:

```typescript
// Main export - all components and utilities
import { 
  FormRenderer, 
  FormBuilder, 
  BootstrapProvider,
  registerCustomComponents,
  getBuilderConfig,
} from 'kolea-shared-package'

// Payload CMS integration
import { /* utilities */ } from 'kolea-shared-package/payload'

// Standalone FormRenderer
import { FormRenderer } from 'kolea-shared-package/FormRenderer'
```

## Local Development

### Set Up Local Path

For development, use the package from a local file path:

```json
{
  "dependencies": {
    "kolea-shared-package": "file:../kolea-cms-formio-builder"
  }
}
```

Then install:

```bash
pnpm install
```

### Build the Package

```bash
# Build once
pnpm run build

# Watch mode for development
pnpm run dev
```

### Type Checking

Ensure TypeScript compatibility:

```bash
pnpm run typecheck
```

## Publishing

The package follows semantic versioning. To publish a new release:

```bash
pnpm run publish -- X.Y.Z
```

This command:
1. Updates the version in `package.json`
2. Builds the package
3. Publishes to npm registry
4. Creates a git tag

## Architecture

```
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  Consuming App              │       │  kolea-shared-package        │
│  (CMS, Portal, etc.)        │◄─────│  (This Package)              │
│                             │       │                              │
│  - FormBuilderField         │       │  - Custom Components         │
│  - CSS Routes               │       │  - Component Registry        │
│  - Import & Use             │       │  - Builder Configuration     │
└─────────────────────────────┘       │  - FormRenderer              │
                                       │  - BootstrapProvider         │
                                       └──────────────────────────────┘
```

## Directory Structure

```
src/
├── components/           # React components
│   ├── FormBuilder.tsx
│   ├── FormRenderer.tsx
│   ├── BootstrapProvider.tsx
│   ├── AppDetailRef.ts
│   ├── SearchableDropdown.ts
│   ├── SSN.ts
│   └── admin/          # Payload CMS specific
│       └── FormBuilderField.tsx
├── config/             # Configuration files
├── plugins/            # Form.io plugins
├── registries/         # Component registry
├── utils/              # Utility functions
└── styles/             # CSS/styling
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm run build` | Build the package |
| `pnpm run dev` | Watch mode during development |
| `pnpm run typecheck` | Check TypeScript types |
| `pnpm run publish -- X.Y.Z` | Publish a new version |

## Peer Dependencies

The package requires:

- `formiojs` ^4.21.0
- `react` >=18.0.0
- `react-dom` >=18.0.0
- `react-select` >=5.0.0

## Documentation

For detailed guides, see:

- [Local Development Guide](./LOCAL-DEVELOPMENT.md) — Set up local environment
- [Form.io Package Guide](./FORMIO-PACKAGE-GUIDE.md) — Architecture and design
- [Form Builder Payload CMS Setup](./formio-builder-payload-cms.md) — CMS integration
- [Consumer Install Guide](./FORMIO-CONSUMER-INSTALL-GUIDE.md) — Installation steps
- [Form Renderer Integration](./formio-renderer-integration.md) — Rendering forms
- [Owner Access Guide](./FORMIO-OWNER-ACCESS-GUIDE.md) — Admin and ownership

## Support

For issues, questions, or contributions, contact the development team or refer to the comprehensive guides included in this package.

## License

See LICENSE file for details.
