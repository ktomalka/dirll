# Description

The script scans dirs and subdirs to find all files without any frameworks, only pure Node.Js

# Usage
Required environment variables:

**SCAN_PATH** - The path of main directory
**PORT** - The port of application
**BASIC_AUTH** - Hash with basic authorization in base64 (login:pass). Is not required.
**ONLY_EXT** - list of extensions to search, separated by comma. Is not required.

example:

```
ONLY_EXT="pdf,doc" BASIC_AUTH="bG9naW46aGFzbG8=" PORT="2000" SCAN_PATH="." node index.js
```
