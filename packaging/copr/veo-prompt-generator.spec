Name:           veo-prompt-generator
Version:        11.0.0
Release:        1%{?dist}
Summary:        Local-first Loofi Creator Studio for Flow/Veo prompts and Suno lyrics
License:        MIT
URL:            https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator
Source0:        Loofi-Flow-Veo-Studio-%{version}-linux-x86_64.rpm

ExclusiveArch:  x86_64
# Preserve the already-qualified Electron payload; it is not a native build
# input and its paths contain spaces that generic strip helpers cannot parse.
%global __brp_strip /bin/true
%global __brp_strip_comment_note /bin/true
%global __brp_strip_lto /bin/true
BuildRequires:  cpio
Requires:       gtk3
Requires:       libnotify
Requires:       nss
Requires:       libXScrnSaver
Requires:       libXtst
Requires:       libsecret
Requires:       xdg-utils
Requires:       at-spi2-core
Requires:       libuuid
Requires(post): desktop-file-utils
Requires(postun): desktop-file-utils

%description
Loofi Creator Studio is a local-first desktop workspace for copy-ready Google
Flow/Veo prompts and Suno Custom Mode lyrics handoffs, with an approval-gated
advanced production workflow. This COPR package repackages the x86_64 RPM from
the matching signed GitHub release while preserving the application payload.

%prep
rm -rf extracted
mkdir -p extracted
rpm2cpio %{SOURCE0} | cpio --extract --make-directories \
    --preserve-modification-time --no-absolute-filenames --directory extracted

%build
# The Electron payload is built and qualified by the matching GitHub release.

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/opt
cp -a extracted/opt/Loofi\ Creator\ Studio %{buildroot}/opt/

if [ -d extracted/usr/share/applications ]; then
    mkdir -p %{buildroot}%{_datadir}/applications
    cp -a extracted/usr/share/applications/. %{buildroot}%{_datadir}/applications/
fi
if [ -d extracted/usr/share/icons ]; then
    mkdir -p %{buildroot}%{_datadir}/icons
    cp -a extracted/usr/share/icons/. %{buildroot}%{_datadir}/icons/
fi

mkdir -p %{buildroot}%{_bindir}
ln -s "/opt/Loofi Creator Studio/veo-prompt-generator" \
    %{buildroot}%{_bindir}/veo-prompt-generator

%post
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database %{_datadir}/applications >/dev/null 2>&1 || :
fi

%postun
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database %{_datadir}/applications >/dev/null 2>&1 || :
fi

%files
%{_bindir}/veo-prompt-generator
/opt/*
%{_datadir}/applications/*
%{_datadir}/icons/hicolor/512x512/apps/*

%changelog
* Thu Aug 13 2026 Loofi Release Engineering <loofiboss-bit@users.noreply.github.com> - 11.0.0-1
- Add the v11 Prompt & Lyrics Studio release to the Fedora COPR channel.
