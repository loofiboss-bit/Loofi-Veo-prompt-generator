# ADR-002: Rust-owned Qt list model

Status: Accepted for M0.

ProjectsModel subclasses QAbstractListModel in Rust with projectId/name roles,
rowCount/data/roleNames and begin/end insertion notifications. Only the GUI
thread mutates the model. QAbstractItemModelTester checks the integration.

CXX-Qt does not automatically turn a Rust Vec into a correctly notifying Qt
model. This explicit model is small and maintainable for M0, while larger data
sets will require measured incremental update behavior. Projects are session
objects. No persisted native format or Electron project adapter is introduced.

Source: https://github.com/KDAB/cxx-qt/blob/v0.10.0/examples/todo_app/src/todo_list.rs
