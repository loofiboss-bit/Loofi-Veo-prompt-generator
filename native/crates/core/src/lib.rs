// SPDX-License-Identifier: GPL-3.0-only
//! Qt-free domain operations for the M0 prototype.
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

pub const APP_ID: &str = "dev.loofi.CreatorStudioNative";
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Idle,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ErrorCode {
    None,
    Busy,
    InvalidInput,
    Io,
    Cancelled,
    Internal,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Error {
    pub code: ErrorCode,
    pub message: String,
}
impl Error {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}
#[derive(Debug)]
pub struct CommandState {
    pub id: u32,
    pub status: Status,
    pub error: Option<Error>,
    cancel: Arc<AtomicBool>,
}
impl Default for CommandState {
    fn default() -> Self {
        Self {
            id: 0,
            status: Status::Idle,
            error: None,
            cancel: Arc::new(AtomicBool::new(false)),
        }
    }
}
impl CommandState {
    pub fn begin(&mut self) -> Result<(u32, Arc<AtomicBool>), Error> {
        if self.status == Status::Running {
            return Err(Error::new(ErrorCode::Busy, "A command is already running"));
        }
        self.id = self
            .id
            .checked_add(1)
            .ok_or_else(|| Error::new(ErrorCode::Internal, "Command IDs exhausted"))?;
        self.status = Status::Running;
        self.error = None;
        self.cancel = Arc::new(AtomicBool::new(false));
        Ok((self.id, self.cancel.clone()))
    }
    pub fn cancel(&mut self) {
        if self.status == Status::Running {
            self.cancel.store(true, Ordering::Release);
            self.status = Status::Cancelled;
            self.error = Some(Error::new(ErrorCode::Cancelled, "Command cancelled"));
        }
    }
    pub fn finish(&mut self, id: u32, result: &Result<Output, Error>) -> bool {
        if id != self.id || self.status != Status::Running {
            return false;
        }
        match result {
            Ok(_) => {
                self.status = Status::Succeeded;
                self.error = None;
            }
            Err(error) => {
                self.status = if error.code == ErrorCode::Cancelled {
                    Status::Cancelled
                } else {
                    Status::Failed
                };
                self.error = Some(error.clone());
            }
        }
        true
    }
}
#[derive(Debug)]
pub enum Command {
    Analyze(String),
    ValidateVideo(PathBuf),
}
#[derive(Debug)]
pub enum Output {
    Analysis(String),
    Video(PathBuf),
}
pub fn execute(command: Command, cancel: &AtomicBool) -> Result<Output, Error> {
    let check = || {
        if cancel.load(Ordering::Acquire) {
            Err(Error::new(ErrorCode::Cancelled, "Command cancelled"))
        } else {
            Ok(())
        }
    };
    check()?;
    let result = match command {
        Command::Analyze(prompt) => {
            if prompt.trim().is_empty() || prompt.len() > 1_048_576 {
                return Err(Error::new(
                    ErrorCode::InvalidInput,
                    "Enter a prompt of at most 1 MiB",
                ));
            }
            let mut words = 0;
            let mut sentences = 0;
            for (index, c) in prompt.chars().enumerate() {
                if index % 4096 == 0 {
                    check()?;
                }
                if matches!(c, '.' | '!' | '?') {
                    sentences += 1;
                }
            }
            for _ in prompt.split_whitespace() {
                words += 1;
                if words % 4096 == 0 {
                    check()?;
                }
            }
            Output::Analysis(format!("Local analysis: {words} words, {} characters, {sentences} sentence markers. No AI service was contacted.", prompt.chars().count()))
        }
        Command::ValidateVideo(path) => {
            let metadata = std::fs::metadata(&path).map_err(|error| {
                Error::new(ErrorCode::Io, format!("Cannot access local video: {error}"))
            })?;
            if !metadata.is_file() || metadata.len() == 0 {
                return Err(Error::new(
                    ErrorCode::InvalidInput,
                    "Select a non-empty regular video file",
                ));
            }
            std::fs::File::open(&path).map_err(|error| {
                Error::new(ErrorCode::Io, format!("Cannot read video: {error}"))
            })?;
            Output::Video(path)
        }
    };
    check()?;
    Ok(result)
}
#[derive(Clone, Debug)]
pub struct Project {
    pub id: String,
    pub name: String,
}
pub fn project_name(name: &str) -> Result<String, Error> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 120 || name.chars().any(char::is_control) {
        return Err(Error::new(
            ErrorCode::InvalidInput,
            "Project name must contain 1–120 characters without control characters",
        ));
    }
    Ok(name.to_owned())
}
#[derive(Clone, Debug)]
pub struct AppDirectories {
    pub config: PathBuf,
    pub data: PathBuf,
    pub cache: PathBuf,
    pub state: PathBuf,
}
impl AppDirectories {
    pub fn from_environment() -> Result<Self, Error> {
        Self::from_values(&std::env::vars().collect())
    }
    pub fn from_values(values: &HashMap<String, String>) -> Result<Self, Error> {
        let home = values
            .get("HOME")
            .map(PathBuf::from)
            .filter(|p| p.is_absolute())
            .ok_or_else(|| Error::new(ErrorCode::InvalidInput, "HOME must be an absolute path"))?;
        let directory = |key: &str, fallback: &str| {
            values
                .get(key)
                .map(PathBuf::from)
                .filter(|p| p.is_absolute())
                .unwrap_or_else(|| home.join(fallback))
                .join(APP_ID)
        };
        Ok(Self {
            config: directory("XDG_CONFIG_HOME", ".config"),
            data: directory("XDG_DATA_HOME", ".local/share"),
            cache: directory("XDG_CACHE_HOME", ".cache"),
            state: directory("XDG_STATE_HOME", ".local/state"),
        })
    }
    pub fn initialize(&self) -> Result<(), Error> {
        for path in [&self.config, &self.data, &self.cache, &self.state] {
            std::fs::create_dir_all(path).map_err(|error| {
                Error::new(
                    ErrorCode::Io,
                    format!("Cannot create {}: {error}", path.display()),
                )
            })?;
        }
        Ok(())
    }
}
pub fn local_path(path: &Path) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path.to_owned())
    } else {
        Err(Error::new(
            ErrorCode::InvalidInput,
            "Select an absolute local video path",
        ))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_lifecycle() {
        let mut state = CommandState::default();
        let (id, _) = state.begin().unwrap();
        assert_eq!(state.begin().unwrap_err().code, ErrorCode::Busy);
        assert_eq!(state.id, id);
        assert!(state.finish(id, &Ok(Output::Analysis("ok".into()))));
        assert_eq!(state.status, Status::Succeeded);
        let (id, token) = state.begin().unwrap();
        state.cancel();
        assert!(token.load(Ordering::Acquire));
        assert!(!state.finish(id, &Ok(Output::Analysis("late".into()))));
        let (new_id, _) = state.begin().unwrap();
        assert!(!state.finish(id, &Err(Error::new(ErrorCode::Io, "old"))));
        assert!(state.finish(new_id, &Err(Error::new(ErrorCode::Io, "failed"))));
        assert_eq!(state.status, Status::Failed);
    }
    #[test]
    fn input_and_cancellation() {
        let token = AtomicBool::new(false);
        assert!(execute(Command::Analyze(" ".into()), &token).is_err());
        assert!(matches!(
            execute(Command::Analyze("A quiet lake.".into()), &token).unwrap(),
            Output::Analysis(_)
        ));
        token.store(true, Ordering::Release);
        assert_eq!(
            execute(Command::Analyze("hello".into()), &token)
                .unwrap_err()
                .code,
            ErrorCode::Cancelled
        );
        assert!(project_name(" ").is_err());
        assert!(project_name("bad\nname").is_err());
        assert_eq!(project_name(" Demo ").unwrap(), "Demo");
    }
    #[test]
    fn xdg_absolute_overrides_and_fallback() {
        let mut values = HashMap::from([
            ("HOME".into(), "/tmp/m0-home".into()),
            ("XDG_DATA_HOME".into(), "/tmp/m0-data".into()),
            ("XDG_CACHE_HOME".into(), "relative".into()),
        ]);
        let dirs = AppDirectories::from_values(&values).unwrap();
        assert_eq!(dirs.data, PathBuf::from("/tmp/m0-data").join(APP_ID));
        assert_eq!(
            dirs.cache,
            PathBuf::from("/tmp/m0-home/.cache").join(APP_ID)
        );
        values.remove("HOME");
        assert!(AppDirectories::from_values(&values).is_err());
    }
    #[test]
    fn file_errors() {
        assert_eq!(
            execute(
                Command::ValidateVideo(PathBuf::from("/nonexistent/creator-m0.mp4")),
                &AtomicBool::new(false)
            )
            .unwrap_err()
            .code,
            ErrorCode::Io
        );
        assert!(local_path(Path::new("relative.mp4")).is_err());
    }
    #[test]
    fn isolated_directories_and_regular_video() {
        let root = std::env::temp_dir().join(format!(
            "creator-m0-core-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).unwrap();
        let values = HashMap::from([("HOME".into(), root.to_string_lossy().into_owned())]);
        let dirs = AppDirectories::from_values(&values).unwrap();
        dirs.initialize().unwrap();
        for path in [&dirs.config, &dirs.data, &dirs.cache, &dirs.state] {
            assert!(path.is_dir());
        }
        let video = root.join("fixture.mp4");
        std::fs::write(
            &video,
            b"readable fixture; decoding is Qt Multimedia's responsibility",
        )
        .unwrap();
        assert!(matches!(
            execute(Command::ValidateVideo(video), &AtomicBool::new(false)),
            Ok(Output::Video(_))
        ));
        let empty = root.join("empty.mp4");
        std::fs::write(&empty, []).unwrap();
        assert_eq!(
            execute(Command::ValidateVideo(empty), &AtomicBool::new(false))
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        assert_eq!(
            execute(
                Command::ValidateVideo(root.clone()),
                &AtomicBool::new(false)
            )
            .unwrap_err()
            .code,
            ErrorCode::InvalidInput
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn ids_and_prompt_size_are_bounded() {
        let mut state = CommandState {
            id: u32::MAX,
            ..Default::default()
        };
        assert_eq!(state.begin().unwrap_err().code, ErrorCode::Internal);
        assert_eq!(state.status, Status::Idle);
        assert_eq!(
            execute(
                Command::Analyze("x".repeat(1_048_577)),
                &AtomicBool::new(false)
            )
            .unwrap_err()
            .code,
            ErrorCode::InvalidInput
        );
    }
}
