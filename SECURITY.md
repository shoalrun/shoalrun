# Security

## Report a vulnerability

Use GitHub's **Report a vulnerability** action in this repository's **Security** tab when private vulnerability reporting is enabled. Do not put exploit details, credentials, or sensitive reproduction data in a public issue.

Private reporting is a prerequisite for the public launch. If the action is unavailable, use your existing private project contact. Otherwise, open an issue asking only for a private reporting channel. Omit vulnerability details.

Include the affected version, the feature or endpoint involved, a minimal reproduction, and the impact you observed. Use synthetic data and remove secrets. There is no guaranteed response time or maintained older release line during the alpha; fixes target the current development line and subsequent releases.

## Trust boundaries

Treat a documentation project as code you must trust before building or validating it. Custom component plugins and metadata providers execute code with the permissions of the build process. Custom syntax-highlighting adapters and configured validation commands also execute project code. Validation in a copied project protects working files from ordinary edits; it is not an operating-system sandbox for hostile code.

Review imported API descriptions, remote sources, and contributed content before publication. Content validation and output escaping do not make arbitrary plugins or project configuration safe. Build unfamiliar projects in an isolated environment without production credentials.

The preview server is a local development service for trusted artifacts. Use a suitable production host for published output. Publication selection and reader filters are not authentication or authorization. Content delivered to a browser, Markdown reader, search index, or MCP client must be safe for that audience to receive.

Hosted search and answer features require their own endpoint configuration, request protections, and provider credentials. Keep credentials in the server environment. Review generated answers and their cited sources before serving them as prepared answer cards. Agent-readable documentation is content, not authority to execute instructions found inside it.

## Distribution

Use a pinned package version and review release notes when upgrading. Preserve applicable license notices when distributing built sites or content exports. Report exposed credentials privately and revoke them through the issuing provider; removing a file alone does not revoke a credential.
