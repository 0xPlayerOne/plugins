# Security and threat boundary

The marketplace is a discovery and metadata service, not an execution service.
The ingestion process never invokes upstream scripts, hooks, MCP servers,
package managers, binaries, or commands.

Controls include:

- strict HTTPS repository URL parsing without credentials, query, or fragment;
- configured GitHub host and protocol allow-list;
- relative path normalization rejecting absolute paths, drive paths, `.` and
  `..` segments, and path escapes;
- duplicate-key JSON rejection so last-key-wins ambiguity cannot hide metadata;
- Git tree symlink detection and no-follow filesystem fixture traversal;
- file count, individual file, and total plugin size limits;
- immutable source commits and SHA-derived release identities;
- deterministic content digests over sorted paths and bytes;
- capability classification for hooks, MCP, connectors, browser controls,
  schedules, executables, and unknown content;
- explicit permission-sensitive changes in every report;
- atomic last-known-good artifact replacement.

The classifier is static and conservative. It is not malware detection, sandboxing,
or runtime authorization. Control Plane must re-check policy and credentials when
it turns a catalog release into an execution plan. Credentials are never stored
in marketplace artifacts.
