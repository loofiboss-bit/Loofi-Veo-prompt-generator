# ADR-001: CXX-Qt boundary and worker lifetime

Status: Accepted for M0.

Rust owns domain operations; QML owns presentation; C++ only hosts Qt and tests.
Use CXX-Qt 0.10.0 QObject properties, registered enums, invokables and notify
signals. The core is Qt-free and independently testable. Cross-language state
is typed, not serialized into a JSON property. CommandStatus and ErrorCode properties
are registered QML enums. The rejection signal carries the registered ErrorCode
ordinal as an int because CXX-Qt 0.10 cannot forward-declare a nested Qt enum in
its generated signal-handler header; the active command state is unaffected.
Controller namespace placement also requires care with associated qenum resolution.

One active Rust worker processes owned data. Completion uses `qt_thread.queue`
to update the controller on its Qt thread. Cancellation has an atomic token and
generation check; stale completion is ignored. Busy requests emit a typed
rejection without replacing the active state. Destruction cancels and joins;
workers never wait for the GUI thread. GUI state transitions and queue failure
need integration tests because Rust unit tests alone cannot validate QObject
lifetime. No async runtime is required for these bounded blocking operations.

CXX-Qt is pre-1.0. Pin dependency versions; further milestones must revisit
compatibility and latency before introducing long-running rendering or networking.

Source: https://kdab.github.io/cxx-qt/book/
