// SPDX-License-Identifier: GPL-3.0-only
#[cxx_qt::bridge(namespace = "loofi::native")]
pub mod qobject {
    #[namespace = ""]
    unsafe extern "C++Qt" {
        include!(<QtCore/QAbstractListModel>);
        #[qobject]
        #[namespace = ""]
        type QAbstractListModel;
    }
    #[namespace = ""]
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
        include!("cxx-qt-lib/qhash.h");
        type QHash_i32_QByteArray = cxx_qt_lib::QHash<cxx_qt_lib::QHashPair_i32_QByteArray>;
        include!("cxx-qt-lib/qvariant.h");
        type QVariant = cxx_qt_lib::QVariant;
        include!("cxx-qt-lib/qmodelindex.h");
        type QModelIndex = cxx_qt_lib::QModelIndex;
    }
    extern "RustQt" {
        #[qobject]
        #[base = QAbstractListModel]
        #[qml_element]
        #[qproperty(i32, count, READ, NOTIFY)]
        #[qproperty(QString, error_message, cxx_name = "errorMessage", READ, NOTIFY)]
        type ProjectsModel = super::ProjectsModelRust;
        #[qinvokable]
        #[cxx_name = "createDemoProject"]
        fn create_demo_project(self: Pin<&mut Self>, name: &QString) -> QString;
        #[qinvokable]
        #[cxx_name = "projectName"]
        fn project_name(self: &Self, id: &QString) -> QString;
        #[qinvokable]
        #[cxx_override]
        fn data(self: &Self, index: &QModelIndex, role: i32) -> QVariant;
        #[qinvokable]
        #[cxx_override]
        #[cxx_name = "roleNames"]
        fn role_names(self: &Self) -> QHash_i32_QByteArray;
        #[qinvokable]
        #[cxx_override]
        #[cxx_name = "rowCount"]
        fn row_count(self: &Self, parent: &QModelIndex) -> i32;
        /// # Safety
        /// Insert notifications must bracket exactly one insertion on the object's Qt thread.
        #[inherit]
        #[cxx_name = "beginInsertRows"]
        unsafe fn begin_insert_rows(
            self: Pin<&mut Self>,
            parent: &QModelIndex,
            first: i32,
            last: i32,
        );
        /// # Safety
        /// Must follow beginInsertRows and its insertion.
        #[inherit]
        #[cxx_name = "endInsertRows"]
        unsafe fn end_insert_rows(self: Pin<&mut Self>);
    }
}
use cxx_qt::CxxQtType;
use cxx_qt_lib::{QByteArray, QHash, QHashPair_i32_QByteArray, QModelIndex, QString, QVariant};
use std::pin::Pin;
#[repr(i32)]
enum ProjectRole {
    ProjectId = 257,
    Name = 258,
}
#[derive(Default)]
pub struct ProjectsModelRust {
    count: i32,
    error_message: QString,
    projects: Vec<creator_native_core::Project>,
}
impl qobject::ProjectsModel {
    fn set_count(mut self: Pin<&mut Self>, value: i32) {
        if self.rust().count != value {
            self.as_mut().rust_mut().count = value;
            self.count_changed();
        }
    }
    fn set_error_message(mut self: Pin<&mut Self>, value: QString) {
        if self.rust().error_message != value {
            self.as_mut().rust_mut().error_message = value;
            self.error_message_changed();
        }
    }
    pub fn create_demo_project(mut self: Pin<&mut Self>, name: &QString) -> QString {
        let name = match creator_native_core::project_name(&name.to_string()) {
            Ok(name) => name,
            Err(error) => {
                self.set_error_message(QString::from(error.message));
                return QString::default();
            }
        };
        let row = self.rust().projects.len() as i32;
        if row == i32::MAX {
            self.set_error_message(QString::from("Project limit reached"));
            return QString::default();
        }
        let id = format!("demo-{}", row + 1);
        // SAFETY: only this invokable mutates the session model, on its Qt thread.
        unsafe {
            self.as_mut()
                .begin_insert_rows(&QModelIndex::default(), row, row);
            self.as_mut()
                .rust_mut()
                .projects
                .push(creator_native_core::Project {
                    id: id.clone(),
                    name,
                });
            self.as_mut().end_insert_rows();
        }
        self.as_mut().set_count(row + 1);
        self.set_error_message(QString::default());
        QString::from(id)
    }
    pub fn project_name(&self, id: &QString) -> QString {
        self.rust()
            .projects
            .iter()
            .find(|p| p.id == id.to_string())
            .map(|p| QString::from(&p.name))
            .unwrap_or_default()
    }
    pub fn data(&self, index: &QModelIndex, role: i32) -> QVariant {
        if !index.is_valid() || index.column() != 0 {
            return QVariant::default();
        }
        self.rust()
            .projects
            .get(index.row() as usize)
            .map(|p| match role {
                role if role == ProjectRole::ProjectId as i32 => {
                    QVariant::from(&QString::from(&p.id))
                }
                role if role == ProjectRole::Name as i32 => QVariant::from(&QString::from(&p.name)),
                _ => QVariant::default(),
            })
            .unwrap_or_default()
    }
    pub fn role_names(&self) -> QHash<QHashPair_i32_QByteArray> {
        let mut roles = QHash::default();
        roles.insert(ProjectRole::ProjectId as i32, QByteArray::from("projectId"));
        roles.insert(ProjectRole::Name as i32, QByteArray::from("name"));
        roles
    }
    pub fn row_count(&self, parent: &QModelIndex) -> i32 {
        if parent.is_valid() {
            0
        } else {
            self.rust().projects.len() as i32
        }
    }
}
