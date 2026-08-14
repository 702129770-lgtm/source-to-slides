# Third-party notices

GZL PPT depends on open-source software listed in `package.json` and resolved in `pnpm-lock.yaml`. The repository does not commit `node_modules` or compiled distribution files.

The direct runtime dependencies use permissive licenses, including MIT, Apache-2.0, ISC, BSD and Zlib terms. Notable combined or embedded notices include:

- JSZip is available under MIT or GPL-3.0-or-later; this project uses it under the MIT option.
- Pako includes MIT and Zlib terms.
- Lucide uses the ISC license and includes Feather-derived work under MIT terms.
- OpenAI's JavaScript SDK uses Apache-2.0.
- `pdf-parse` uses MIT and includes PDF.js-derived code under Apache-2.0 terms.

When distributing a bundled build, preserve all notices required by the dependency versions included in that build. Run `pnpm licenses list` against the release lockfile to produce the authoritative inventory.
