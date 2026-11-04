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
6. Synchronize the reviewed release source to the public default branch through a fast-forward or reviewed PR. Push the tag for the exact artifact source commit. Keep unfinished follow-up work separate. Verify GitHub's package version, install examples, changelog and bundled-documentation provenance; publishing to npm does not update the repository. Do not force-push over intervening work.

Release tooling must treat registry verification and source synchronization as
required completion steps. Create the annotated `vVERSION` tag at the exact
artifact source commit and push it atomically with `main`. After any registry
processing delay, resume source synchronization once the checksum matches;
checking npm alone cannot complete a release. Retry synchronization without
uploading the package again.

For release tooling that records `plan.json`, the reviewed artifact and matching
`verified.json` together, use the resumable finalizer after registry publication:

```sh
node framework/scripts/complete-release.mjs --plan PATH_TO_REVIEWED_PLAN_JSON
```

It requires the full verification receipt, checks both local artifact hashes and
registry integrity, then pushes the source and annotated tag atomically without
force or checkout changes. It verifies the remote state and writes
`completed.json` beside the plan. Rerunning it never uploads an npm package.
Release scripts using this receipt format must invoke this finalizer after
publication, including when resuming after a registry processing delay.

Run the completion check using the reviewed artifact's recorded values:

```sh
node framework/scripts/check-release.mjs --version VERSION --commit FULL_SOURCE_COMMIT --integrity REVIEWED_SHA512
```

This checks registry integrity and the actual remote tag, including its annotated
commit target. Remote `main` must contain that commit. A missing tag, a tag for
different source, or an unpublished package fails the check. Keep its successful
report with the release evidence before reporting the package release complete.
Do not move a published version tag to a later documentation-only commit.

For a coordinated docs release, track website completion separately: upgrade the
exact registry dependency and current installation examples, pass release input
checks, build and check the production bundle, review generated answers, upload
prebuilt output, and verify the live build identity and changed content. Retain
the reviewed build identity with the release evidence. Until those checks pass,
report the package and website states separately.

Repository publication, package publication, and website deployment are separate operations. Hosted workflows remain manual. Do not enable automatic releases or deploy the website as a side effect of a source change.

Check current dependency advisories from `framework/` with `npm audit` and `npm audit --omit=dev`. Review findings and their applicability before changing dependencies. A clean advisory report does not replace source review or behavioral tests.

## Verify the result

Confirm the package's quickstart works for its intended audience and its bundled documentation matches that version. If the website is also deployed, verify the live build identity, HTML and Markdown URLs, discovery resources, and any enabled hosted services. Report known limitations explicitly.
