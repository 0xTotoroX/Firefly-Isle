# Third-party notices and distribution boundaries

The project's AGPL-3.0-only declaration covers project-owned code that it has
authority to license. It does not relicense dependencies, music, fonts, icons
or other third-party material. Their copyright and license notices remain.
This is a targeted record of reviewed components, not a complete inventory.

## Historical GSAP dependency

GSAP 3.15.0 and ScrollTrigger were formerly used by the login story. Revision
0ff8c17dbd3be0a6485b4a499edb6f9a40fa3309 replaced that use with project-owned
browser-native motion and removed the manifest/lock entries. Current source
has no GSAP runtime imports; historical Git revisions retain their actual
third-party rights. This notice neither relicenses GSAP nor grants a linking
exception. Its historical Standard No Charge terms are available at
https://gsap.com/community/standard-license/.

## Fonts, icons and UI components

The locked @fontsource/inter, @fontsource/ibm-plex-mono and
@fontsource-variable/material-symbols-outlined packages use SIL OFL-1.1.
Retain their actual package copyright notices and OFL texts with distributed
font files. public/material-symbols-license.txt is already present.
Do not replace these notices with the project's AGPL license.

Radix, React, shadcn and html2canvas-pro retain their MIT notices. Lucide keeps
its ISC and inherited icon notices. Other dependencies retain their own
licenses. Modified or copied shadcn components need their upstream notice;
package metadata alone does not establish the provenance of every template.
LICENSES/shadcn-MIT.txt preserves the installed shadcn release's original
MIT notice for retained or derived shadcn material; it is also copied into
the build's license materials. This does not attribute every local component
to shadcn or replace other upstream notices.

## Audio assets: separate from the code license

The existing public/audio/tracks/AGENTS.md statements and audio files remain
unchanged. Audio is excluded from the AGPL code grant. This change does not
investigate the scope of music permissions, delete tracks or claim that public
or onward redistribution has been confirmed. Preserve the original asset
statements; this file grants no additional music rights.

## Build inclusion and source availability

The build includes LICENSE, LICENSING.md, historical MIT evidence, this notice
and the installed runtime releases' original license/notice files in dist/licenses.
The matching project and runtime release files are available in the source archive
linked from /source/index.html, together with its revision and content digest.
Copies retain their actual original terms; this is not a blanket upstream rights
or preferred-source certification. Source archives contain public source and
configuration examples, not private runtime data. Building files does not publish
them or confirm that an independently deployed backend has the same revision.
