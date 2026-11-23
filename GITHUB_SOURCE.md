# Public GitHub Copy

Repository: https://github.com/jacobciolino/Dash-Punch

The public repository is a source-only snapshot, not a playable release or a
mirror of the local development history. The authoritative project remains the
local Dash Punch directory.

Do not push this local repository's history to the public repository: older
commits contain licensed assets. Publish a fresh source-only tree instead.

`node tools/export-public-source.cjs /tmp/dash-punch-public-source.json` exports
tracked text source, tests, tools and documentation. It excludes all assets,
binary media, packages, dependencies and local artifacts. It checks for embedded
media and common credential formats before producing the upload manifest. The
public README explains the exclusions, and the public .gitignore excludes assets
to reduce the risk of accidental later uploads.

Art, audio and fonts must be supplied separately under their original licenses.
Historical-checkpoint tests require the private local development history. The
public snapshot alone is not a standalone offline game. Existing release files
remain local and are not uploaded by this workflow.
