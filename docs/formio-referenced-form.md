# Referenced Form

## Overview

### What it is

The Referenced Form component embeds a separate, independently managed form inside the current form. You select the target form from a dropdown in the designer; the component stores only the form reference. When the page renders, the embedded form is loaded and displayed in full, and any data entered inside it is included in the parent form's submission.

In the designer canvas, the component shows a read-only preview of the selected form.

### When to use it

- When you need to embed a complete sub-form that is managed and reused independently — for example, embedding an "Applicant Details" form inside an "Application" form.
- When the same sub-form appears in multiple parent forms and must stay in sync with one source.
- When the parent form is a wizard and the embedded form may also have multiple steps. Navigation across the embedded wizard steps is handled automatically by the parent.
- Prefer this component over copying fields manually when a group of fields is shared across forms.

### Prerequisites

- The forms API must be running and accessible from the browser before you configure this component.
- Each instance of this component must have an **API Endpoint** configured in the **Data Source** tab. The Form dropdown in the Display tab will be empty until a valid endpoint is entered and the tab is navigated away from.
- If the forms API requires authentication, the correct credentials must be entered in the Data Source tab before the form list can be loaded.

---

## Finding it in the designer

The component lives in the **Basic** group in the left sidebar.

1. Open the Form.io builder.
2. In the left sidebar, find the **Basic** section.
3. Locate **Referenced Form**.
4. Drag it onto the canvas at the desired position.
5. The edit dialog opens automatically. Select the target form in the Display tab before saving.

---

## Display tab

This is the primary configuration tab.

### Form

A dropdown list of all available forms, displayed as **Title (slug)**. Select the form you want to embed.

The dropdown is **empty until you configure the API Endpoint** in the Data Source tab. After entering the endpoint and navigating away from that tab (or blurring the field), the dropdown automatically fetches and populates the available forms. If the list remains empty, the endpoint may be unreachable or returning no results.

Selecting a form immediately shows a read-only preview of that form inside the edit dialog.

This field stores the reference only. To reference individual fields from the embedded form elsewhere in the parent form, add Reference Field components separately.

### Label

A text field. Defaults to `Referenced Form`. Used as the component's identifier in the designer canvas. The label is not shown to end users when the form is rendered.

### Initial Focus

A checkbox. Default: off.

When enabled, the first input inside the embedded form receives focus automatically when the page loads. Useful when the embedded form is the primary content on the page and keyboard users should land directly in it.

### Hidden

A checkbox. Default: off.

When enabled, this component and the embedded form are not shown to the user. Use the Conditional tab to hide the component based on field values instead of setting this permanently.

---

## Data Source tab

This tab controls how the component fetches the forms list and the embedded form. It must be configured before the Form dropdown in the Display tab will populate.

### API Type

A dropdown with two options:

- **Custom API** — a standard endpoint with no authentication. Use this for internal or open APIs.
- **Secure API** — an endpoint that requires authentication. Selecting this reveals additional fields for credentials.

Default: **Custom API**.

### API Endpoint

A text field. Enter the base URL of the forms API, for example `/api/forms`. The selected form's ID is appended automatically at runtime to fetch the individual form.

Leave the field and navigate to another tab, or press Enter, to trigger the forms list fetch and populate the Form dropdown in the Display tab.

### HTTP Method

A dropdown. Choose **GET** or **POST**. Default: **GET**.

### Authentication Type

*Visible only when API Type is set to Secure API.*

Currently supports **Basic Auth**. Select this to reveal the username and password fields.

### Basic Auth Username

*Visible only when API Type is Secure API and Authentication Type is Basic Auth.*

Enter the username for Basic Authentication.

### Basic Auth Password

*Visible only when API Type is Secure API and Authentication Type is Basic Auth.*

Enter the password for Basic Authentication. The value is masked in the UI.

### Partner ID Header

*Visible only when API Type is set to Secure API.*

Enter the value to send as the `partner-id` HTTP header with every request to the secure endpoint. Leave blank if your API does not require this header.

### Data Path in Response

A text field. Enter a dot-notation path to locate the form schema inside the API response. Default: `schema`.

For example:
- If your API returns `{ schema: { display: "form", components: [...] } }`, leave this as `schema`.
- If your API returns `{ data: { schema: { ... } } }`, set this to `data.schema`.
- If your API returns the schema object directly at the root, clear this field.

---

## API tab

### Property Name

A required text field. Defaults to `appDetailRef`.

This is the unique key for this component. It determines where the embedded form's submitted data appears in the parent form submission. If you place more than one Referenced Form component in the same form, each one must have a different property name.

Use camelCase with no spaces, for example: `applicantDetails`, `employmentHistory`.

---

## Conditional tab

Use this tab to show or hide the component based on values elsewhere in the form. Two options are available.

### Simple

Configure a condition using three fields:

| Field | What to enter |
|---|---|
| This component should Display | Choose **True** to show, **False** to hide when the condition matches. |
| When the form component | Enter the **Property Name** (API key) of the field to check. |
| Has the value | Enter the value that triggers the condition. |

**Example**: Show this component only when `applicationType` equals `full`.
- Display: `True`
- When: `applicationType`
- Has the value: `full`

### Advanced Conditions (JSONLogic)

A textarea for entering a [JSON Logic](https://jsonlogic.com) expression. Use this for conditions that involve multiple fields or operators not supported by the Simple panel.

**Example**: Hide when `status` is either `draft` or `archived`:

```json
{"!":[{"in":[{"var":"data.status"},["draft","archived"]]}]}
```

---

## Logic tab

Use this tab to control component behavior with JavaScript. Two fields are available.

### Custom Conditional

A JavaScript textarea. Controls whether this component is visible. Set `show` to `true` or `false`. Runs on every form change.

Available variables: `show`, `data`, `row`, `component`, `instance`.

**Example**: Show only when another field has a value:

```js
show = !!data.selectedCategory;
```

**Example**: Hide when the application is in a specific status:

```js
show = data.applicationStatus !== 'archived';
```

### Custom Default Value

A JavaScript textarea. Sets a default value when the form loads. Set the `value` variable.

This field is rarely used for Referenced Form because the component does not capture a user-entered value — it embeds a full form. Only use it if you have a specific reason to pre-set the selected form programmatically.

---

## How it behaves after setup

- In the **designer canvas**, a read-only preview of the selected form is rendered inside the component boundary. If no form is selected, the placeholder text `Referenced Form (select a form)` is shown.
- When the page with the form **renders for a user**, the embedded form is fetched from the configured API endpoint and displayed in full. The user fills it out as part of the parent form. If no API endpoint is configured, the component shows an error message instead.
- **Validation** inside the embedded form is enforced. Required fields in the embedded form must be completed before the parent form can be submitted. If the embedded form is a wizard nested inside a wizard parent, only the current step of the embedded form is validated when the user clicks Next — not all steps at once.
- **Submission data** from the embedded form is included automatically in the parent form submission, stored under this component's Property Name.

---

## Pre-publish checklist

- Confirm that the **API Endpoint** is filled in under the Data Source tab and that the Form dropdown in the Display tab shows available forms.
- After selecting a form in the Display tab, confirm the read-only preview appears in the edit dialog and on the canvas.
- If using Secure API, confirm credentials are entered and that the Form dropdown populates correctly.
- Confirm the **Data Path in Response** matches your API's response structure, or the embedded form will not load at runtime.
- Confirm the Property Name in the API tab is unique. If two Referenced Form components share the same key, one will overwrite the other's data in the submission.
- If conditions are configured, test that the component shows and hides correctly based on the expected field values.
- Confirm that required fields inside the embedded form block submission as expected.

---

## Tips & gotchas

- If the Form dropdown is empty after entering the API endpoint, navigate away from the Data Source tab and back to the Display tab to trigger the fetch. You can also blur the API Endpoint field or press Enter to trigger it immediately.
- The API Endpoint is configured per component, not globally. Every Referenced Form instance must have its own endpoint set. Copying a component onto the canvas copies the endpoint too — verify it points to the correct API for that instance.
- Always update the Property Name when adding more than one Referenced Form to the same canvas. The default `appDetailRef` key is the same for every instance and will cause data conflicts if left unchanged.
- If the API returns the schema at the root level (not nested), clear the Data Path in Response field entirely.
- Avoid selecting a form that itself contains a Referenced Form pointing back to the current form. Circular references will cause loading problems at runtime.
- The label set in the Display tab is never shown to end users. It is only visible in the designer as an identifier. Do not rely on it to communicate anything to the person filling out the form.
