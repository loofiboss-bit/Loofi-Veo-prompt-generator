---
description: 'Cross-platform shell execution rules for AI agents operating in VS Code'
applyTo: '**'
---

# Agent Shell Execution Rules

## OS Detection

Before executing any shell command, determine the target OS:

- **Windows**: Use PowerShell syntax (`Get-ChildItem`, `$PWD`, `;` or line breaks)
- **Linux/macOS**: Use Bash/Zsh syntax (`ls`, `pwd`, `&&`)

## PowerShell Rules (Windows)

- Use `;` to chain statements on one line, or separate lines
- Use `|` for pipeline operations
- Never use `&&` (PowerShell 5.x does not support it reliably)
- Never create subshells (`powershell -c "..."`) unless explicitly required
- Use `Test-Path` instead of `[ -f ]` or `[ -d ]`
- Use `Get-ChildItem` instead of `ls` or `dir` in scripts
- Use `Set-Location` or `Push-Location`/`Pop-Location` for directory changes
- Quote paths containing spaces: `"C:\Path With Spaces"`
- Validate paths before `Set-Location`:
  ```powershell
  if (Test-Path "target-dir") { Set-Location "target-dir" }
  ```

## Bash/Zsh Rules (Linux/macOS)

- Use `&&` to chain commands
- Use `cd target-dir && command` pattern
- Use `[ -d "path" ]` for directory checks
- Use `[ -f "path" ]` for file checks

## Path Handling

- Always use absolute paths when the target is far from CWD
- Use relative paths for nearby directories
- Never assume a working directory exists — verify first
- On Windows, use backslash `\` or forward slash `/` (both work in PowerShell)

## Error Handling

- Always check exit codes for critical operations
- Use `$LASTEXITCODE` in PowerShell, `$?` in Bash
- Provide fallback behavior when commands fail
- Set timeouts for long-running operations

## Build Tool Compatibility

- **CMake**: Use `cmake -B build; cmake --build build` (PowerShell) or `cmake -B build && cmake --build build` (Bash)
- **npm**: Works cross-platform without changes
- **Python**: Use `python` on Windows, `python3` on Linux unless venv is active
- **pytest**: Use `python -m pytest` for reliable module resolution
