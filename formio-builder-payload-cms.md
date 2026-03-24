# Kolea Shared Package — Setup Guide for Payload CMS

This guide explains how to configure `kolea-shared-package` inside a Payload CMS project. The package provides custom Form.io components and tools for building and rendering forms, but requires manual setup within your Payload project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Configuration](#database-configuration)
4. [Manual Setup](#manual-setup)
5. [Using the Form Builder](#using-the-form-builder)
6. [Custom Components](#custom-components)
7. [Next Steps](#next-steps)

---

## Prerequisites

Before installing and configuring the package, ensure you have:

- **Payload CMS** project installed and running
- **PostgreSQL** database configured and accessible
- **Node.js**, **pnpm** and **npm**) package manager
- **React 18+** and **React DOM 18+**
- **Form.io.js** (`formiojs ^4.21.0`)
- **Bootstrap 5** (`bootstrap ^5.3.0` — required for Form.io styling)

### GitHub Packages Access

The package is published to GitHub Packages under the `<@SCOPE>` scope. You must configure access before installation:

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with these scopes:
   - `repo`
   - `read:packages`

2. Create or update `.npmrc` in your project root:

```ini
<@SCOPE>:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_YOUR_TOKEN_HERE
```

Replace `ghp_YOUR_TOKEN_HERE` with your actual token. Do **not** commit this file if it contains real tokens.

---

## Installation


### 1. Install the Kolea Shared Package

```bash
pnpm add kolea-shared-package@npm:<@SCOPE>/kolea-shared-package@<VERSION>
```

### 3. Database Configuration During Installation

The package **will prompt you for database configuration** during installation via the `postinstall` script.

**You must have these details ready:**

- PostgreSQL host (e.g., `localhost`, `db.example.com`)
- PostgreSQL port (typically `5432`)
- Database name
- PostgreSQL username
- PostgreSQL password

When prompted, provide these credentials. The package will create a `forms` table in your PostgreSQL database.

**If the prompts do not appear:**

Run the post-install script manually:

```bash
node node_modules/kolea-shared-package/scripts/install-patch.cjs
```

---

## Database Configuration

### Table Structure

The package creates a `forms` table in PostgreSQL with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PRIMARY KEY) | Unique form identifier |
| `title` | VARCHAR | Form display name |
| `slug` | VARCHAR (UNIQUE) | URL-safe identifier (e.g., `benefits-application`) |
| `description` | TEXT | Internal notes about the form |
| `status` | VARCHAR | Form status: `draft` or `published` |
| `schema` | JSONB | Form.io schema containing form definition |
| `settings` | JSONB | Form settings (submit button text, messages, etc.) |
| `createdAt` | TIMESTAMP | Creation timestamp (auto-set by Payload) |
| `updatedAt` | TIMESTAMP | Last update timestamp (auto-set by Payload) |

### Verifying Database Creation


If the table was not created, manually create it or re-run the postinstall script.

---

## Manual Setup

Now that the package is installed and the database table is created, you must configure it manually in your Payload project.

### 1. Create the FormBuilder Collection in Payload

The package includes a `FormBuilder` collection definition. **You must manually add it to your Payload configuration.**

Create or update `src/collections/FormBuilder.ts`:

```typescript
export const FormBuilder = {
  slug: 'formBuilder',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: 'FormBuilder Management',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-safe identifier used by the API (e.g. benefits-application).',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Internal reference only.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'schema',
      type: 'json',
      required: true,
      defaultValue: { display: 'form', components: [] },
      admin: {
        description: 'FormBuilder schema — use the Form Builder below to edit.',
        components: {
          Field: '/components/admin/FormBuilderField',
        },
      },
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'submitButtonText',
          type: 'text',
          defaultValue: 'Submit',
        },
        {
          name: 'successMessage',
          type: 'textarea',
        },
        {
          name: 'allowMultipleSubmissions',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
  ],
}
```

### 2. Add the Collection to Payload Configuration

In your `payload.config.ts`:

```typescript
import { buildConfig } from 'payload'
import { FormBuilder } from './collections/FormBuilder'

export default buildConfig({
  // ... other config ...
  collections: [
    FormBuilder,
    // ... other collections ...
  ],
})
```

### 3. Create the Form Builder Field Component

The `FormBuilderField` component is the bridge between Payload's admin panel and Form.io. Create it at `src/components/admin/FormBuilderField.tsx`:

```typescript
'use client'

import React, { Suspense } from 'react'
import { FormBuilder } from 'kolea-shared-package'
import type { FormBuilderProps } from 'kolea-shared-package'

const FormBuilderField: React.FC<FormBuilderProps> = (props) => {
  return (
    <Suspense fallback={<div>Loading Form Builder...</div>}>
      <FormBuilder {...props} />
    </Suspense>
  )
}

export default FormBuilderField
```

### 4. Configure the Import Map in Payload

Payload must resolve the path `/components/admin/FormBuilderField` correctly. Generate or update your import map using the Payload CLI:

```bash
pnpm payload build
```

This command automatically creates and configures the import map, ensuring Payload can resolve component paths like `/components/admin/FormBuilderField` relative to your `src/` directory.

If you need to manually configure it in your `payload.config.ts`:

```typescript
export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(__dirname),
    },
  },
  // ... rest of config ...
})
```

### 5. Initialize the Package Configuration

Setup the package configuration to point to your forms API endpoint:

```typescript
import { configure } from 'kolea-shared-package'

configure({
  formBuilderListUrl: '/api/formBuilder',
})
```

### 6. Update Payload Types

To ensure full TypeScript type safety, update your Payload global types to include the FormBuilder collection.

Create or update `src/payload-types.ts`:

```typescript
import type { Form } from 'kolea-shared-package'

declare global {
  namespace Payload {
    interface Collections {
      formBuilder: Form
    }
  }
}

export type Form = {
  id: string
  title: string
  slug: string
  description?: string
  status: 'draft' | 'published'
  schema: FormBuilderSchema
  settings: {
    submitButtonText?: string
    successMessage?: string
    allowMultipleSubmissions?: boolean
  }
  createdAt: string
  updatedAt: string
}

export type FormBuilderSchema = {
  display: 'form' | 'wizard' | 'pdf'
  components: FormBuilderComponent[]
  settings?: Record<string, any>
}

export type FormBuilderComponent = {
  type: string
  key: string
  label?: string
  placeholder?: string
  required?: boolean
  [key: string]: any
}
```

Then reference it in your `payload.config.ts`:

```typescript
import type { Form, FormBuilderSchema } from './payload-types'

declare global {
  namespace Payload {
    interface Collections {
      formBuilder: Form
    }
  }
}
```

**Using types in your application:**

```typescript
import type { Form, FormBuilderSchema } from '@/payload-types'

export const fetchFormBuilder = async (slug: string): Promise<Form | null> => {
  const response = await fetch(`/api/formBuilder?where[slug][equals]=${slug}`)
  const data = await response.json()
  return data.docs[0] || null
}

const handleRenderForm = (form: Form) => {
  const schema: FormBuilderSchema = form.schema
  // Now fully typed!
}
```

---

## Using the Form Builder

### Accessing the Form Builder in Payload Admin

1. Navigate to **Form Management** → **Forms** in the Payload admin.
2. Click **Create** to add a new form, or edit an existing form.
3. In the **schema** field, the Form.io Form Builder interface will appear.
4. Use the visual **Sidebar** on the left to drag-and-drop form components:
   - **Basic**: Text, Number, Email, Checkbox, Select, etc.
   - **Intermediate**: Radio, Signature, File upload, etc.
   - **Advanced**: Custom components (App Detail Ref, Searchable Dropdown, SSN).
5. Click **Save** to persist the form schema.

### Form.io Builder Features

The Form.io builder provides:

- **Drag-and-drop** component composition
- **Real-time preview** of the form
- **Validation rules** configuration
- **Conditional logic** (show/hide components based on field values)
- **Custom component support** (see section below)

### Example Form Schema

When you save a form, Payload stores the schema as JSON, typically like:

```json
{
  "display": "form",
  "components": [
    {
      "type": "textfield",
      "key": "firstName",
      "label": "First Name",
      "placeholder": "Enter your first name",
      "input": true,
      "required": true
    },
    {
      "type": "email",
      "key": "email",
      "label": "Email Address",
      "placeholder": "Enter your email",
      "input": true,
      "required": true
    },
    {
      "type": "button",
      "action": "submit",
      "label": "Submit",
      "theme": "primary"
    }
  ]
}
```

---

## Custom Components

The package provides three pre-configured custom Form.io components that are ready to use out of the box. All custom components are automatically registered and available in the Form Builder sidebar under the **Advanced** section.

### Registering Custom Components

All custom components must be registered in your application before they can be used. Call `registerCustomComponents()` early in your application initialization:

```typescript
import { registerCustomComponents, configure } from 'kolea-shared-package'

// Initialize and configure the package
configure({
  formBuilderListUrl: '/api/formBuilder',
})

// Register all custom components
registerCustomComponents()
```

**Where to call this:**

- In a root layout or initialization file (Next.js: `app/layout.tsx` or `_app.tsx`)
- Before any form builder or renderer is rendered
- After Payload CMS is initialized

**Example in a Next.js layout:**

```typescript
'use client'

import { useEffect } from 'react'
import { registerCustomComponents, configure } from 'kolea-shared-package'

export default function RootLayout({ children }) {
  useEffect(() => {
    configure({
      formBuilderListUrl: '/api/formBuilder',
    })
    registerCustomComponents()
  }, [])

  return <html>{children}</html>
}
```

---

### 1. App Detail Ref Component

The **App Detail Ref** component allows you to reference and display data from other forms already created in your Payload CMS. It's useful for showing additional details or context from related forms.

**Purpose:**
- Reference data from existing forms
- Display detailed information from another form's submission
- Create cross-references between forms

**Usage in Form Builder:**

1. In the Form Builder, drag a component onto your form
2. Select **App Detail Ref** from the **Advanced** section
3. Configure:
   - **Collection** — which Payload collection to reference
   - **Reference Field** — which field contains the form data
   - **Display** — how to show the referenced data

**Configuration in Code:**

```typescript
import { setupAppDetailRefFormDropdown } from 'kolea-shared-package'

// Setup the App Detail Ref component with form references
setupAppDetailRefFormDropdown({
  // Payload collection that contains form builder forms
  formCollection: 'formBuilder',
  
  // Field in the form that should be displayed as reference
  displayField: 'title',
  
  // API endpoint to fetch forms
  apiEndpoint: '/api/formBuilder',
})
```

**Example Form Schema with App Detail Ref:**

```json
{
  "display": "form",
  "components": [
    {
      "type": "appDetailRef",
      "key": "relatedForm",
      "label": "Related Form Details",
      "placeholder": "Select a form to reference",
      "input": true,
      "required": true,
      "data": {
        "formCollection": "formBuilder",
        "displayField": "title"
      }
    },
    {
      "type": "textfield",
      "key": "additionalNotes",
      "label": "Additional Notes",
      "placeholder": "Add more information"
    }
  ]
}
```

**In Code — Accessing Referenced Data:**

```typescript
const handleFormSubmit = (submission: any) => {
  const { relatedForm, additionalNotes } = submission.data
  
  console.log('Referenced Form:', relatedForm)
  // Output: { id: 'form-uuid', title: 'Application Form', slug: 'application-form' }
  
  console.log('Additional Notes:', additionalNotes)
}
```

---

### 2. Searchable Dropdown Component

The **Searchable Dropdown** component provides a server-side dropdown that fetches and filters options from an API endpoint. Users can search and select from a dynamically loaded list.

**Purpose:**
- Load options from an API endpoint
- Allow users to search through large datasets
- Populate dropdown fields with backend data

**Configuration in Code:**

```typescript
import { SearchableDropdownComponent } from 'kolea-shared-package'

// Configure the endpoint that provides dropdown options
const dropdownConfig = {
  // API endpoint that returns the list of options
  apiEndpoint: '/api/countries',
  
  // Field in the response that contains the array of options
  optionsField: 'data',
  
  // Debounce delay for search (in milliseconds)
  debounceDelay: 300,
}
```

**API Endpoint Response Structure:**

Your API endpoint must return a JSON object with this structure:

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "United States",
      "code": "US"
    },
    {
      "id": "2",
      "name": "Canada",
      "code": "CA"
    },
    {
      "id": "3",
      "name": "Mexico",
      "code": "MX"
    }
  ]
}
```

**Required Fields in Each Option Object:**

```typescript
interface SearchableDropdownItem {
  id: string | number           // Unique identifier for the option
  name?: string                  // Display label (or use labelField)
  label?: string                 // Alternative display label
  value?: string | number        // Value to submit (or use valueField)
  [key: string]: any            // Any additional fields
}
```

**Usage in Form Builder:**

1. Drag a **Searchable Dropdown** component from the **Advanced** section
2. Configure:
   - **API Endpoint** — URL to fetch options (e.g., `/api/countries`)
   - **Label Field** — which field to display (default: `name`)
   - **Value Field** — which field to submit (default: `id`)
   - **Placeholder** — hint text for the user

**Example Form Schema:**

```json
{
  "display": "form",
  "components": [
    {
      "type": "searchableDropdown",
      "key": "country",
      "label": "Select Country",
      "placeholder": "Search for a country...",
      "input": true,
      "required": true,
      "data": {
        "apiEndpoint": "/api/formBuilder/countries",
        "labelField": "name",
        "valueField": "id",
        "optionsField": "data"
      }
    }
  ]
}
```

**Backend API Example — Create `/api/countries` endpoint:**

```typescript
// Next.js API route: src/app/api/formBuilder/countries/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  // Fetch countries from database or external service
  const allCountries = [
    { id: '1', name: 'United States', code: 'US' },
    { id: '2', name: 'Canada', code: 'CA' },
    { id: '3', name: 'Mexico', code: 'MX' },
    { id: '4', name: 'United Kingdom', code: 'UK' },
  ]

  // Filter based on search query
  const filtered = allCountries.filter((country) =>
    country.name.toLowerCase().includes(query.toLowerCase())
  )

  return Response.json({
    success: true,
    data: filtered,
  })
}
```

**In Code — Accessing Submitted Value:**

```typescript
const handleFormSubmit = (submission: any) => {
  const { country } = submission.data
  
  console.log('Selected Country:', country)
  // Output: "1" (the ID value)
  
  // Fetch full country object if needed
  const selectedCountry = await fetch(`/api/countries?id=${country}`)
}
```

---

### 3. SSN Component

The **SSN (Social Security Number)** component is a specialized text field for inputting Social Security Numbers. It provides automatic formatting and validation.

**Purpose:**
- Collect SSN with proper formatting
- Validate SSN format (XXX-XX-XXXX)
- Ensure data quality for sensitive government forms

**Features:**
- **Auto-formatting**: Automatically inserts hyphens as user types (e.g., `123456789` → `123-45-6789`)
- **Validation**: Ensures only valid SSN format is accepted
- **Security**: Clear masking for sensitive input
- **Placeholder**: Shows format hint to users

**Usage in Form Builder:**

1. Drag an **SSN** component from the **Advanced** section
2. The component automatically handles:
   - Input formatting
   - Validation rules
   - Error messages

**Example Form Schema:**

```json
{
  "display": "form",
  "components": [
    {
      "type": "ssn",
      "key": "ssn",
      "label": "Social Security Number",
      "placeholder": "XXX-XX-XXXX",
      "input": true,
      "required": true,
      "mask": "999-99-9999"
    },
    {
      "type": "textfield",
      "key": "fullName",
      "label": "Full Name",
      "input": true,
      "required": true
    }
  ]
}
```

**Configuration in Code:**

```typescript
import { SSNComponent } from 'kolea-shared-package'

// SSN component is pre-configured, just import and use
// No additional configuration needed

export const createApplicationForm = () => {
  return {
    display: 'form',
    components: [
      {
        type: 'ssn',
        key: 'ssn',
        label: 'Social Security Number',
        required: true,
        // Component handles formatting automatically
      },
    ],
  }
}
```

**In Code — Accessing SSN Data:**

```typescript
const handleFormSubmit = (submission: any) => {
  const { ssn, fullName } = submission.data
  
  console.log('SSN:', ssn)
  // Output: "123-45-6789" (formatted with hyphens)
  
  // Save to database
  await fetch('/api/applications', {
    method: 'POST',
    body: JSON.stringify({
      ssn: ssn.replace(/-/g, ''), // Remove hyphens before storing
      fullName,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Validation Rules:**

The SSN component enforces:
- **Format**: Must be XXX-XX-XXXX or 9 digits
- **Length**: Exactly 9 digits
- **Non-zero check**: Cannot be all zeros (000-00-0000)
- **Valid range**: Does not validate against actual SSN database (use backend validation for that)

**Backend Validation Example:**

```typescript
// Validate SSN more strictly on the server
function isValidSSN(ssn: string): boolean {
  // Remove formatting
  const cleaned = ssn.replace(/-/g, '')
  
  // Check format
  if (!/^\d{9}$/.test(cleaned)) return false
  
  // Reject all zeros
  if (cleaned === '000000000') return false
  
  // Reject area number 666 or 900-999
  const areaNumber = parseInt(cleaned.substring(0, 3))
  if (areaNumber === 666 || areaNumber >= 900) return false
  
  return true
}
```

---

### Complete Setup Example

Here's a complete example that registers and configures all custom components:

```typescript
// src/utils/formio-setup.ts

import {
  registerCustomComponents,
  configure,
  setupAppDetailRefFormDropdown,
} from 'kolea-shared-package'

export function initializeFormio() {
  // Configure the package
  configure({
    formBuilderListUrl: '/api/formBuilder',
  })

  // Register all custom components
  registerCustomComponents()

  // Setup App Detail Ref for form references
  setupAppDetailRefFormDropdown({
    formCollection: 'formBuilder',
    displayField: 'title',
    apiEndpoint: '/api/formBuilder',
  })
}
```

Then call this in your root layout:

```typescript
// src/app/layout.tsx
'use client'

import { useEffect } from 'react'
import { initializeFormio } from '@/utils/formio-setup'

export default function RootLayout({ children }) {
  useEffect(() => {
    initializeFormio()
  }, [])

  return <html>{children}</html>
}
```

## Related Documentation

- **[formio-renderer-integration.md](formio-renderer-integration.md)** — Quick guide to using FormRenderer in your application with single form and wizard form patterns.
- **[FORMIO-PACKAGE-GUIDE.md](FORMIO-PACKAGE-GUIDE.md)** — Architecture overview and package internals.
- **[FORMIO-CONSUMER-INSTALL-GUIDE.md](FORMIO-CONSUMER-INSTALL-GUIDE.md)** — GitHub Packages setup for consumers.
