# Release checklist

Shoalrun is an alpha. This checklist describes release preparation; checked source and a successful build are not evidence that a package has been published or a site deployed.

## Before the first public release

- Review every Git ref and its reachable history that will become public for credentials, private material, and unintended artifacts. Review findings individually; preserve attribution and license notices.
- Confirm that bundled dependencies, fonts, examples, and documentation carry their applicable licenses and provenance.
- Prepare the security policy before changing repository visibility. GitHub private vulnerability reporting is available for public repositories. Enable it immediately after making the repository public, then verify the reporting action before announcing the launch. Recheck `SECURITY.md`.
- Review the README, contribution policy, package metadata, and public links from a newcomer's perspective. Website-source access must not be required to report documentation problems.
- Complete public package distribution separately: choose the public registry, update installation instructions and package access, then verify installation without credentials or custom registry configuration.
- Ask new users to follow the showcase quickstart, import an API description, and use the bundled skills with their own agent. Record and fix reproducible obstacles; do not substitute maintainer familiarity for these trials.

## Prepare a version

1. Review the final source diff and update the package version, lockfile, and changelog together. Keep dated release notes accurate and include upgrade instructions for changed behavior.
2. Update versioned installation examples. Keep the documentation snapshot pinned to a reviewed source commit; use the explicit import workflow when updating it.
3. Build once for the final source inputs. Run compiled regression tests and skill validation, then certify the isolated package installation with `npm run authoring:package-check`. Check affected HTML, Markdown, accessibility, and output consumers.
4. Inspect the actual package inventory and archive. Exclude credentials, local instructions, caches, test output, and unintended files; retain required notices. Verify the archive's version and integrity.
5. Publish the reviewed artifact through the authorized release process. Confirm the registry version and integrity and test the installed package. Record a matching source tag and release notes; do not label an unpublished artifact as released.

Repository publication, package publication, and website deployment are separate operations. Hosted workflows remain manual. Do not enable automatic releases or deploy the website as a side effect of a source change.

Check current dependency advisories from `framework/` with `npm audit` and `npm audit --omit=dev`. Review findings and their applicability before changing dependencies. A clean advisory report does not replace source review or behavioral tests.

## Verify the result

Confirm the package's quickstart works for its intended audience and its bundled documentation matches that version. If the website is also deployed, verify the live build identity, HTML and Markdown URLs, discovery resources, and any enabled hosted services. Report known limitations explicitly.
