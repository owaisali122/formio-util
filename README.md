# @owaisali122/kolea-cms-formio-builder

Shared Form.io custom components for builder and renderer. Use this package to embed the Form.io designer (e.g. in Payload admin), scope Bootstrap/Form.io CSS so it doesn’t affect the host app, and render saved forms in React.

## Installation

In the project that will use the builder and/or renderer (e.g. CMS or portal):

```bash
pnpm add formIoBuilder@npm:@owaisali122/kolea-cms-formio-builder@^1.0.0
```

See `FORMIO-CONSUMER-INSTALL-GUIDE.md` for GitHub Packages setup and `.npmrc` for the `<user>` scope.


## Custom components

**Previous version** included:

- **Form Reference** (App Detail Ref) — create form reference / link to other forms.
- **Server-side dropdown** (Searchable Dropdown) — dropdown with server-side data.

**This version** includes:

- **SSN** — custom SSN component.


**Next version**:

- --

The registry and builder config are set up so these components are registered and available in the Form.io builder sidebar.

## Peer dependencies

- `formiojs` ^4.21.0
- `react` >=18
- `react-dom` >=18

Consuming projects must install these themselves. Use `bootstrap@5.3.8` in the host app for Form.io’s Bootstrap template.

## License

Private / use as needed.
