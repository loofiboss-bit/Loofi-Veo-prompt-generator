# Publishing the Wiki

The canonical wiki source lives in `docs/wiki/` in the application repository. Reading these pages
in GitHub or locally does not mean they have been published to the separate GitHub Wiki service.
No remote publication is performed by documentation updates alone.

## Review the source first

1. Review the README, Home, Quick Start and capability boundaries against the current source.
2. Check local Markdown links, banner paths and formatting.
3. Confirm the downloadable version independently on GitHub Releases; do not infer publication
   from `package.json` or development notes.
4. Obtain authorization before pushing to the separate wiki repository.

## Prepare a separate wiki checkout

GitHub Wiki uses a separate Git repository with pages at its root. Enable Wiki in repository settings
if necessary, then clone that wiki repository into a separate directory when publishing is authorized.
Copy the Markdown pages from `docs/wiki/` there, including `_Sidebar.md` and `_Footer.md`.

Adapt links in that publication copy, keeping the source files here unchanged:

| Source reference                                           | GitHub Wiki copy                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Quick-Start.md` and other sibling page links              | Wiki page links such as `Quick-Start`, without `.md`                                      |
| `../USER_GUIDE.md`, `../RELEASE.md`, implementation docs   | Full repository `blob/main/docs/...` URL                                                  |
| `../../README.md`, `../../PRIVACY.md`, `../../SECURITY.md` | Full repository `blob/main/...` URL                                                       |
| `../../assets/...` image paths                             | Copy images into wiki `assets/` and update to that path, or use repository raw image URLs |
| `PUBLISHING.md`                                            | The wiki page `PUBLISHING`, if retained for maintainers                                   |

The repository base is `https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator`.
When using raw images, use an appropriate immutable ref if the publication must preserve a fixed
release appearance. The source banner is `assets/branding/github-banner.png`.

## Verify before and after publication

Preview the Home page, banner, sidebar and footer from the separate checkout. Inspect the publication
diff for broken parent links, incorrect package versions and unintended files. Commit and push only
within the authorized publication scope.

After pushing, read back the public Home, Quick Start and iteration guide in the actual GitHub Wiki.
Verify page navigation and images there. Record the wiki commit and observed public URLs. A local
preview or successful push alone does not confirm the rendered public result.

Return to [Wiki Home](Home.md) or the [repository documentation index](../README.md).
