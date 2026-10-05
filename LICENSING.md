# Licensing and source delivery

Copyright (c) 2026 Ghibli1024.

Project-owned code in this licensing revision is offered under AGPL-3.0-only
(GNU Affero General Public License, version 3 only). The unmodified license
text is in LICENSE. No permission to choose later versions or a separate
commercial license is granted by this notice. Commercial use is permitted
under the license; no noncommercial or royalty condition is added.

This declaration applies only to code the project has authority to license
in this revision and subsequent authorized revisions. Copyright and license
notices on third-party components remain effective. THIRD_PARTY_NOTICES.md
identifies reviewed components and unresolved delivery requirements.

Earlier MIT grants remain effective for the versions and material received
under them. LICENSES/Firefly-Isle-MIT-before-2026-10-05.txt preserves the previous
top-level notice verbatim as historical evidence. It is not an alternative
license election for newly added AGPL-only material. No old tag, release or
third-party license is withdrawn or relabeled.

## Delivery requirements

Before distributing a covered build, provide its complete Corresponding
Source by an applicable AGPL section 6 method, including build instructions,
project-owned frontend and backend code, and required non-secret installation
information. Preserve applicable third-party notices in the source and build.
Do not include patient records, credentials or private runtime configuration.

For a modified version used over a network, section 13 requires a prominent,
free source offer to the remote users who interact with that version. Provide
an accessible source download or source page in the application, identify the
exact deployed revision, and make the corresponding archive available. A
link to an old or unpushed GitHub revision does not satisfy this delivery check.
The login page, privacy gate and shared topbar link to /source/index.html
without requiring authentication. npm run build creates that public source page,
a content-hashed source archive, SOURCE_MANIFEST.json and dist/licenses/ with
the project's full license, historical MIT evidence and original runtime package
notices. It records the Git revision and source content digest; uncommitted
snapshots are labeled, and source changes during compilation fail the build.
No archive URL claims that unpushed code is already present on a remote.

The archive includes approved project frontend/backend/build files, native shell
sources, public backend configuration and exact
installed npm runtime release files, with lock/version checks and the releases'
original notices. Generally available unmodified build tools remain dependencies
specified by the lock. The archive supports rebuilding outside Git; its manifest
and content digest identify later modifications. Private runtime configuration,
credentials, records and historical private documents are outside the source
allowlist; public configuration examples are included. This packaging does not
certify the complete upstream rights or preferred-source chain of every npm
release. Independently deployed backend functions must match the offered source.

Music, fonts and images are separate assets, outside the project's code grant;
their existing files and statements remain. This change does not investigate
music authorization or confer a new redistribution grant.

The former GSAP login dependency was replaced with project-owned native scroll
motion in revision 0ff8c17dbd3be0a6485b4a499edb6f9a40fa3309. This revision does not
add a GSAP linking exception. This build mechanism does not publish or deploy the files. Actual deployments
must serve their matching source archive and preserve third-party boundaries;
this document does not certify unrelated assets or a production release.
