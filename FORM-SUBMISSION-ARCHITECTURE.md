# Form Rendering & Submission Storage Architecture

This guide explains how to set up a public form portal with **separate database storage** for form submissions, independent from the Form Builder database (Payload CMS).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Database Strategy](#database-strategy)
4. [Implementation Guide](#implementation-guide)
5. [API Contracts](#api-contracts)
6. [Example: Complete Setup](#example-complete-setup)
7. [Deployment Considerations](#deployment-considerations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CMS (Payload)                              │
│  - Form Builder UI                                                  │
│  - Form Schema Database (PostgreSQL #1)                             │
│  - API: /api/formBuilder (list & get schemas)                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ Schema API
                           │ (read-only)
                           ▼
        ┌──────────────────────────────────────┐
        │   Public Portal (Next.js / React)    │
        │                                       │
        │  - FormRenderer components           │
        │  - Form display logic                │
        │  - User interactions                 │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Submission Handler              │ │
        │  │ (validates & saves submissions) │ │
        │  └────────────┬────────────────────┘ │
        └───────────────┼──────────────────────┘
                        │
                        │ POST /api/submissions
                        │
                        ▼
        ┌──────────────────────────────────────┐
        │   Submission API (Node.js/Next.js)   │
        │   - Validates data                   │
        │   - Stores to submission DB          │
        │   - Handles webhooks (optional)      │
        └──────────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────┐
        │  Submission Database (PostgreSQL #2) │
        │  - form_submissions table            │
        │  - form_field_values table           │
        │  - Completely separate from Payload  │
        └──────────────────────────────────────┘
```

---

## System Components

### 1. Form Builder (CMS - Payload)
- **Purpose**: Create and manage form schemas
- **Database**: Payload CMS PostgreSQL database
- **Exports**: Form schemas via `/api/formBuilder` endpoint
- **Read-only**: Portal only reads schemas, never writes to this DB

### 2. Public Portal (Next.js/React)
- **Purpose**: Render forms to end users
- **Components**: Uses `FormRenderer` from `kolea-shared-package`
- **Fetch**: Retrieves form schemas from CMS `/api/formBuilder`
- **Submit**: Sends submission data to submission API

### 3. Submission API
- **Purpose**: Receive, validate, and store form submissions
- **Location**: Can be part of portal's `/api/submissions` or separate microservice
- **Validation**: Validates against form schema (schema stored in cache or fetched)
- **Storage**: Saves to submission database

### 4. Submission Database
- **Purpose**: Store all form submissions
- **Isolation**: Completely separate PostgreSQL instance from Payload DB
- **Schema**: Custom tables for submissions (not managed by Payload)
- **Access**: Only submission API has direct access

---

## Database Strategy

### Why Separate Databases?

1. **Data Isolation**: Sensitive submission data separate from form/content administration
2. **Performance**: Form submissions don't impact CMS performance  
3. **Compliance**: Easier to manage data retention/deletion for submissions separately
4. **Security**: Different credentials for submission DB vs. admin DB
5. **Scalability**: Scale submission storage independently

### Submission Database Schema

```sql
-- Table to store form submissions
CREATE TABLE form_submissions (
  id SERIAL PRIMARY KEY,
  form_slug VARCHAR(255) NOT NULL,         -- Form identifier
  form_name VARCHAR(255),                  -- Form name (denormalized for UX)
  submission_data JSONB NOT NULL,          -- Full form submission (all fields)
  ip_address INET,                         -- User's IP
  user_agent TEXT,                         -- Browser info
  status VARCHAR(50) DEFAULT 'submitted',  -- submitted, validated, processed, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_by VARCHAR(255),               -- Optional user ID/email
  metadata JSONB                           -- Custom metadata
);

-- Optional: Index critical fields for fast queries
CREATE INDEX idx_submissions_form_slug ON form_submissions(form_slug);
CREATE INDEX idx_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX idx_submissions_status ON form_submissions(status);

-- Optional: Table for tracking validation/processing errors
CREATE TABLE submission_errors (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES form_submissions(id),
  error_code VARCHAR(100),
  error_message TEXT,
  field_key VARCHAR(255),                 -- Which field had the error
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Table for audit trail
CREATE TABLE submission_audit_log (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES form_submissions(id),
  action VARCHAR(100),                    -- created, viewed, exported, etc.
  actor VARCHAR(255),                     -- Who performed the action
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Guide

### Step 1: Configure Portal to Fetch Form Schemas

In your public portal's initialization (`setupFormio.ts`):

```typescript
// app/formio/setupFormio.ts
'use client'

import { registerCustomComponents, configure } from 'kolea-shared-package'

let _registered: Promise<unknown> | null = null

export function initFormioRenderer() {
  if (!_registered) {
    _registered = (async () => {
      // Configure to fetch schemas from CMS
      configure({
        formsListUrl: process.env.NEXT_PUBLIC_CMS_FORMBUILDER_API,
        // e.g., https://cms.example.com/api/formBuilder
        
        bootstrapCssUrl: '/api/bootstrap-css',
        formioCssUrl: '/api/formio-css',
        fontAwesomeFontsUrl: '/fonts/',
      })

      await registerCustomComponents()
    })()
  }

  return _registered
}
```

### Step 2: Create Submission API Handler

In your portal's API route (`app/api/submissions/route.ts`):

```typescript
// app/api/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Connection to SEPARATE submission database
const submissionPool = new Pool({
  connectionString: process.env.SUBMISSION_DATABASE_URL,
  // Connection details are different from Payload CMS database
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formSlug, data, metadata } = body

    // 1. Validate form exists in CMS
    const schema = await fetchFormSchema(formSlug)
    if (!schema) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // 2. Validate submission data against schema
    const validationResult = await validateSubmission(schema, data)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      )
    }

    // 3. Store in SUBMISSION database (separate DB)
    const client = await submissionPool.connect()
    try {
      const result = await client.query(
        `INSERT INTO form_submissions 
         (form_slug, form_name, submission_data, ip_address, user_agent, metadata, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [
          formSlug,
          schema.title || formSlug,
          JSON.stringify(data),
          request.ip || null,
          request.headers.get('user-agent'),
          JSON.stringify(metadata || {}),
          'submitted',
        ]
      )

      const submission = result.rows[0]

      // 4. Trigger webhook/notification if configured
      await triggerSubmissionWebhook(formSlug, submission.id, data)

      return NextResponse.json(
        {
          success: true,
          submissionId: submission.id,
          createdAt: submission.created_at,
        },
        { status: 201 }
      )
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    )
  }
}

// Fetch form schema from CMS
async function fetchFormSchema(slug: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_CMS_FORMBUILDER_API}?where[slug][equals]=${slug}`
  )
  const data = await response.json()
  return data.docs?.[0] || null
}

// Validate submission against Form.io schema
async function validateSubmission(schema: any, data: Record<string, any>) {
  // Basic validation example - enhance with Form.io's validation logic
  const errors: Record<string, string> = {}

  schema.components?.forEach((component: any) => {
    if (component.validate?.required && !data[component.key]) {
      errors[component.key] = `${component.label} is required`
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Optional: Trigger webhook when submission received
async function triggerSubmissionWebhook(
  formSlug: string,
  submissionId: number,
  data: Record<string, any>
) {
  const webhookUrl = process.env[`WEBHOOK_${formSlug.toUpperCase()}`]
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        formSlug,
        data,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.warn(`Webhook failed for ${formSlug}:`, error)
  }
}
```

### Step 3: Create Form Renderer Component

In your portal (`app/components/FormPage.tsx`):

```typescript
// app/components/FormPage.tsx
'use client'

import { useRef, useState } from 'react'
import { FormRenderer } from 'kolea-shared-package'
import { initFormioRenderer } from '@/app/formio/setupFormio'

interface FormPageProps {
  formSlug: string
  title?: string
}

export function FormPage({ formSlug, title }: FormPageProps) {
  const [schema, setSchema] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useRef(() => {
    // Initialize Form.io on mount
    void initFormioRenderer()
  }, [])

  // Fetch form schema on mount
  useRef(() => {
    async function loadSchema() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_CMS_FORMBUILDER_API}?where[slug][equals]=${formSlug}`
        )
        const data = await response.json()
        const formSchema = data.docs?.[0]

        if (!formSchema) {
          setError(`Form "${formSlug}" not found`)
          return
        }

        setSchema(formSchema.schema)
      } catch (err) {
        setError('Failed to load form')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSchema()
  }, [formSlug])

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Send to SUBMISSION API (separate DB)
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug,
          data,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }

      setSuccess(true)
      // Redirect or show success message
      setTimeout(() => {
        window.location.href = '/forms/success'
      }, 2000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div>Loading form...</div>
  if (error) return <div className="error">{error}</div>
  if (success) return <div className="success">Form submitted successfully!</div>

  return (
    <div className="form-container">
      <h1>{title || formSlug}</h1>
      {schema && (
        <FormRenderer
          schema={schema}
          onSubmit={handleSubmit}
          readOnly={isSubmitting}
        />
      )}
    </div>
  )
}
```

---

## API Contracts

### CMS Form Builder API

**Endpoint**: `GET /api/formBuilder`

**Query Parameters**:
- `where[slug][equals]=form-slug` - Filter by form slug

**Response**:
```json
{
  "docs": [
    {
      "id": "123",
      "slug": "user-registration",
      "title": "User Registration Form",
      "schema": {
        "display": "form",
        "components": [
          {
            "type": "textfield",
            "key": "firstName",
            "label": "First Name",
            "validate": { "required": true }
          }
        ]
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Portal Submission API

**Endpoint**: `POST /api/submissions`

**Request Body**:
```json
{
  "formSlug": "user-registration",
  "data": {
    "firstName": "John",
    "email": "john@example.com"
  },
  "metadata": {
    "source": "public-portal",
    "campaign": "signup-2024"
  }
}
```

**Success Response** (201):
```json
{
  "success": true,
  "submissionId": 1234,
  "createdAt": "2024-03-13T10:30:00Z"
}
```

**Error Response** (400/500):
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Email is required"
  }
}
```

---

## Example: Complete Setup

### Environment Setup

**CMS (.env.local)**:
```
DATABASE_URI=postgresql://user:pass@localhost:5432/cms_db
```

**Portal (.env.local)**:
```
NEXT_PUBLIC_CMS_FORMBUILDER_API=https://cms.example.com/api/formBuilder
SUBMISSION_DATABASE_URL=postgresql://user:pass@localhost:5433/submissions_db
WEBHOOK_USER_REGISTRATION=https://webhook.example.com/registrations
```

### Database Setup Script

```bash
#!/bin/bash

# Create submission database
psql -h localhost -U postgres -c "CREATE DATABASE submissions_db;"

# Apply schema
psql -h localhost -U postgres -d submissions_db < submission-schema.sql

# Create application user
psql -h localhost -U postgres -d submissions_db -c \
  "CREATE USER portal_app WITH PASSWORD 'secure_password'; GRANT ALL ON ALL TABLES IN SCHEMA public TO portal_app;"
```

---

## Deployment Considerations

### 1. Environment Separation

```
CMS Environment (Payload)
┌─────────────────────────────┐
│ Database: cms.example.com    │
│ Port: 5432                  │
└─────────────────────────────┘

Portal Environment (Next.js)
┌─────────────────────────────┐
│ FormBuilder API:            │
│ https://cms.example.com/api │
│                             │
│ Submission Database:        │
│ submissions.example.com     │
│ Port: 5432                  │
└─────────────────────────────┘
```

### 2. Database Security

- **CMS Database**: Restrict to CMS server only
- **Submission Database**: Restrict to Portal API server only
- **Network**: Use VPC/security groups to isolate databases
- **Credentials**: Use environment variables, never hardcode
- **SSL/TLS**: Enable SSL for database connections

### 3. API Security

```typescript
// Add CORS if CMS on different domain
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.PORTAL_DOMAIN,
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Add rate limiting to submission endpoint
// Add CSRF protection if needed
// Add input sanitization
```

### 4. Monitoring & Logging

```typescript
// Log submission attempts
console.log(`Submission received: ${formSlug} from ${ip}`)

// Monitor submission success rate
metrics.recordSubmission(formSlug, {
  success: true,
  duration: endTime - startTime,
  dataSize: JSON.stringify(data).length,
})
```

### 5. Data Backup Strategy

- **CMS Database**: Regular backup (form definitions are relatively stable)
- **Submission Database**: More frequent backups (submissions accumulate)
- **Separate backup schedules** for each database
- **Test restore procedure** regularly

---

## Summary

| Component | Database | Purpose |
|-----------|----------|---------|
| CMS (Payload) | PostgreSQL #1 | Form schemas, admin data |
| Portal (Next.js) | None (stateless) | Renders forms, forwards submissions |
| Submission API | PostgreSQL #2 | Receives & validates submissions |
| Submission DB | PostgreSQL #2 | Stores all form submissions |

This architecture ensures:
✓ Clean separation of concerns  
✓ Independent scaling  
✓ Secure data isolation  
✓ Compliance-friendly  
✓ Easy maintenance & backup  
