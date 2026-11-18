// SPDX-License-Identifier: GPL-3.0-only
#[cxx_qt::bridge]
pub mod qobject {
    #[namespace = ""]
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
        include!("cxx-qt-lib/qurl.h");
        type QUrl = cxx_qt_lib::QUrl;
    }
    #[qenum(NativeController)]
    #[namespace = ""]
    enum CommandStatus {
        Idle,
        Running,
        Succeeded,
        Failed,
        Cancelled,
    }
    #[qenum(NativeController)]
    #[namespace = ""]
    enum ErrorCode {
        None,
        Busy,
        InvalidInput,
        Io,
        Cancelled,
        Internal,
    }
    extern "RustQt" {
        #[qobject]
        #[namespace = "loofi::native"]
        #[qml_element]
        #[qproperty(CommandStatus, status, READ, NOTIFY)]
        #[qproperty(ErrorCode, error_code, cxx_name = "errorCode", READ, NOTIFY)]
        #[qproperty(QString, message, READ, NOTIFY)]
        #[qproperty(u32, command_id, cxx_name = "commandId", READ, NOTIFY)]
        #[qproperty(QString, analysis, READ, NOTIFY)]
        #[qproperty(
            QString,
            selected_project_id,
            cxx_name = "selectedProjectId",
            READ,
            NOTIFY
        )]
        #[qproperty(
            QString,
            selected_project_name,
            cxx_name = "selectedProjectName",
            READ,
            NOTIFY
        )]
        #[qproperty(QUrl, validated_video, cxx_name = "validatedVideo", READ, NOTIFY)]
        #[qproperty(
            QString,
            config_directory,
            cxx_name = "configDirectory",
            READ,
            CONSTANT
        )]
        #[qproperty(QString, data_directory, cxx_name = "dataDirectory", READ, CONSTANT)]
        #[qproperty(QString, cache_directory, cxx_name = "cacheDirectory", READ, CONSTANT)]
        #[qproperty(QString, state_directory, cxx_name = "stateDirectory", READ, CONSTANT)]
        type NativeController = super::NativeControllerRust;
        #[qinvokable]
        #[cxx_name = "analyzePrompt"]
        fn analyze_prompt(self: Pin<&mut Self>, prompt: &QString);
        #[qinvokable]
        #[cxx_name = "validateVideo"]
        fn validate_video(self: Pin<&mut Self>, url: &QUrl);
        #[qinvokable]
        #[cxx_name = "cancelCommand"]
        fn cancel_command(self: Pin<&mut Self>);
        #[qinvokable]
        #[cxx_name = "setSelectedProject"]
        fn set_selected_project(self: Pin<&mut Self>, id: &QString, name: &QString);
        #[qsignal]
        #[cxx_name = "commandRejected"]
        fn command_rejected(self: Pin<&mut Self>, code: i32, message: QString);
    }
    impl cxx_qt::Threading for NativeController {}
}
use creator_native_core::{
    AppDirectories, Command, CommandState, Error, ErrorCode, Output, Status,
};
use cxx_qt::{CxxQtType, Threading};
use cxx_qt_lib::{QString, QUrl};
use std::{pin::Pin, thread::JoinHandle};
pub struct NativeControllerRust {
    status: qobject::CommandStatus,
    error_code: qobject::ErrorCode,
    message: QString,
    command_id: u32,
    analysis: QString,
    selected_project_id: QString,
    selected_project_name: QString,
    validated_video: QUrl,
    config_directory: QString,
    data_directory: QString,
    cache_directory: QString,
    state_directory: QString,
    state: CommandState,
    worker: Option<JoinHandle<()>>,
}
impl Default for NativeControllerRust {
    fn default() -> Self {
        let mut value = Self {
            status: qobject::CommandStatus::Idle,
            error_code: qobject::ErrorCode::None,
            message: QString::default(),
            command_id: 0,
            analysis: QString::default(),
            selected_project_id: QString::default(),
            selected_project_name: QString::default(),
            validated_video: QUrl::default(),
            config_directory: QString::default(),
            data_directory: QString::default(),
            cache_directory: QString::default(),
            state_directory: QString::default(),
            state: CommandState::default(),
            worker: None,
        };
        match AppDirectories::from_environment().and_then(|dirs| {
            dirs.initialize()?;
            Ok(dirs)
        }) {
            Ok(dirs) => {
                value.config_directory = QString::from(dirs.config.to_string_lossy().as_ref());
                value.data_directory = QString::from(dirs.data.to_string_lossy().as_ref());
                value.cache_directory = QString::from(dirs.cache.to_string_lossy().as_ref());
                value.state_directory = QString::from(dirs.state.to_string_lossy().as_ref());
            }
            Err(error) => {
                value.status = qobject::CommandStatus::Failed;
                value.error_code = map_error(error.code);
                value.message = QString::from(error.message);
            }
        }
        value
    }
}
impl Drop for NativeControllerRust {
    fn drop(&mut self) {
        self.state.cancel();
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}
fn map_error(code: ErrorCode) -> qobject::ErrorCode {
    match code {
        ErrorCode::None => qobject::ErrorCode::None,
        ErrorCode::Busy => qobject::ErrorCode::Busy,
        ErrorCode::InvalidInput => qobject::ErrorCode::InvalidInput,
        ErrorCode::Io => qobject::ErrorCode::Io,
        ErrorCode::Cancelled => qobject::ErrorCode::Cancelled,
        ErrorCode::Internal => qobject::ErrorCode::Internal,
    }
}
fn map_status(status: Status) -> qobject::CommandStatus {
    match status {
        Status::Idle => qobject::CommandStatus::Idle,
        Status::Running => qobject::CommandStatus::Running,
        Status::Succeeded => qobject::CommandStatus::Succeeded,
        Status::Failed => qobject::CommandStatus::Failed,
        Status::Cancelled => qobject::CommandStatus::Cancelled,
    }
}
// QML reads controller state; only Rust commands may mutate it.
macro_rules! property_setter {
    ($method:ident, $field:ident, $signal:ident, $type:ty) => {
        fn $method(mut self: Pin<&mut Self>, value: $type) {
            if self.rust().$field != value {
                self.as_mut().rust_mut().$field = value;
                self.$signal();
            }
        }
    };
}
impl qobject::NativeController {
    property_setter!(set_analysis, analysis, analysis_changed, QString);
    property_setter!(
        set_selected_project_id,
        selected_project_id,
        selected_project_id_changed,
        QString
    );
    property_setter!(
        set_selected_project_name,
        selected_project_name,
        selected_project_name_changed,
        QString
    );
    property_setter!(
        set_validated_video,
        validated_video,
        validated_video_changed,
        QUrl
    );
    pub fn analyze_prompt(self: Pin<&mut Self>, prompt: &QString) {
        self.start(Ok(Command::Analyze(prompt.to_string())));
    }
    pub fn validate_video(self: Pin<&mut Self>, url: &QUrl) {
        let command = if let Some(path) = url.to_local_file() {
            creator_native_core::local_path(std::path::Path::new(&path.to_string()))
                .map(Command::ValidateVideo)
        } else {
            Err(Error::new(
                ErrorCode::InvalidInput,
                "Only local video files are supported",
            ))
        };
        self.start(command);
    }
    pub fn set_selected_project(mut self: Pin<&mut Self>, id: &QString, name: &QString) {
        self.as_mut().set_selected_project_id(id.clone());
        self.set_selected_project_name(name.clone());
    }
    pub fn cancel_command(mut self: Pin<&mut Self>) {
        self.as_mut().rust_mut().state.cancel();
        self.sync_state();
    }
    fn sync_state(mut self: Pin<&mut Self>) {
        let status = map_status(self.rust().state.status);
        let id = self.rust().state.id;
        let error = self.rust().state.error.clone();
        let code = error
            .as_ref()
            .map(|e| map_error(e.code))
            .unwrap_or(qobject::ErrorCode::None);
        let message = QString::from(error.map(|e| e.message).unwrap_or_default());
        let changed = (
            self.rust().command_id != id,
            self.rust().status != status,
            self.rust().error_code != code,
            self.rust().message != message,
        );
        // Publish a coherent snapshot before any synchronous Qt observer runs.
        {
            let mut state = self.as_mut().rust_mut();
            state.command_id = id;
            state.status = status;
            state.error_code = code;
            state.message = message;
        }
        if changed.0 {
            self.as_mut().command_id_changed();
        }
        if changed.2 {
            self.as_mut().error_code_changed();
        }
        if changed.3 {
            self.as_mut().message_changed();
        }
        if changed.1 {
            self.status_changed();
        }
    }
    fn start(mut self: Pin<&mut Self>, command: Result<Command, Error>) {
        if self
            .rust()
            .worker
            .as_ref()
            .is_some_and(|w| !w.is_finished())
            || self.rust().state.status == Status::Running
        {
            self.command_rejected(
                qobject::ErrorCode::Busy.repr,
                QString::from("A command is already running or stopping"),
            );
            return;
        }
        if let Some(worker) = self.as_mut().rust_mut().worker.take() {
            let _ = worker.join();
        }
        let (id, cancel) = match self.as_mut().rust_mut().state.begin() {
            Ok(value) => value,
            Err(error) => {
                self.command_rejected(map_error(error.code).repr, QString::from(error.message));
                return;
            }
        };
        self.as_mut().sync_state();
        let command = match command {
            Ok(command) => command,
            Err(error) => {
                let result = Err(error);
                self.as_mut().rust_mut().state.finish(id, &result);
                self.sync_state();
                return;
            }
        };
        let qt_thread = self.qt_thread();
        let worker = std::thread::Builder::new()
            .name("creator-native-command".into())
            .spawn(move || {
                let result =
                    std::panic::catch_unwind(|| creator_native_core::execute(command, &cancel))
                        .unwrap_or_else(|_| {
                            Err(Error::new(ErrorCode::Internal, "Command worker panicked"))
                        });
                // Queue is non-blocking and rejects safely after QObject destruction.
                let _ = qt_thread.queue(move |mut this| {
                    if !this.as_mut().rust_mut().state.finish(id, &result) {
                        return;
                    }
                    if let Ok(output) = result {
                        match output {
                            Output::Analysis(text) => {
                                this.as_mut().set_analysis(QString::from(text))
                            }
                            Output::Video(path) => {
                                this.as_mut().set_validated_video(QUrl::from_local_file(
                                    &QString::from(path.to_string_lossy().as_ref()),
                                ))
                            }
                        }
                    }
                    this.sync_state();
                });
            });
        match worker {
            Ok(worker) => self.as_mut().rust_mut().worker = Some(worker),
            Err(error) => {
                self.as_mut().rust_mut().state.finish(
                    id,
                    &Err(Error::new(
                        ErrorCode::Internal,
                        format!("Cannot start worker: {error}"),
                    )),
                );
                self.sync_state();
            }
        }
    }
}
