// SPDX-License-Identifier: GPL-3.0-only
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs
import QtMultimedia
import Loofi.Native

ApplicationWindow {
    id: root
    objectName: "root"
    width: 1280
    height: 800
    visible: true
    title: "Loofi Creator Studio Native — M0"
    property string page: "studio"
    property string rejectedMessage: ""
    property string videoError: ""
    property bool benchmarkAutoplay: false
    property bool benchmarkVideoMode: false
    property bool videoReady: false
    property bool pendingVideoValidation: false
    property alias nativeController: controller
    property alias projectModel: projects

    function showPage(name: string): void {
        if (["studio", "projects", "video", "camera"].indexOf(name) >= 0)
            page = name
    }
    function openVideo(videoUrl: url): void {
        page = "video"
        videoError = ""
        videoReady = false
        player.stop()
        player.source = ""
        pendingVideoValidation = true
        controller.validateVideo(videoUrl)
    }
    onPageChanged: {
        if (page !== "video") {
            player.stop()
            player.source = ""
        } else if (controller.validatedVideo.toString().length > 0) {
            player.source = controller.validatedVideo
        }
    }
    onClosing: {
        player.stop()
        player.source = ""
        controller.cancelCommand()
    }
    NativeController { id: controller; objectName: "controller" }
    ProjectsModel { id: projects; objectName: "projectsModel" }
    Connections {
        target: controller
        function onCommandRejected(code: int, message: string): void {
            root.rejectedMessage = message
            root.pendingVideoValidation = false
        }
        function onCommandIdChanged(): void { root.rejectedMessage = "" }
        function onValidatedVideoChanged(): void {
            if (root.page === "video") {
                root.videoError = ""
                player.source = controller.validatedVideo
            }
        }
        function onStatusChanged(): void {
            if (root.pendingVideoValidation && controller.status !== NativeController.Running) {
                root.pendingVideoValidation = false
                if (controller.status === NativeController.Succeeded && root.page === "video") {
                    root.videoError = ""
                    player.source = controller.validatedVideo
                    if (root.benchmarkVideoMode)
                        player.play()
                }
            }
        }
    }
    Shortcut { sequence: "Ctrl+1"; onActivated: root.showPage("projects") }
    Shortcut { sequence: "Ctrl+2"; onActivated: root.showPage("studio") }
    Shortcut { sequence: "Ctrl+3"; onActivated: root.showPage("video") }
    Shortcut { sequence: "Ctrl+4"; onActivated: root.showPage("camera") }
    Shortcut { sequence: "Ctrl+O"; onActivated: { root.showPage("video"); fileDialog.open() } }

    FileDialog {
        id: fileDialog
        objectName: "fileDialog"
        title: "Open a local video"
        nameFilters: ["Video files (*.mp4 *.webm *.mkv *.mov *.avi)", "All files (*)"]
        fileMode: FileDialog.OpenFile
        onAccepted: root.openVideo(selectedFile)
    }
    MediaPlayer {
        id: player
        objectName: "videoPlayer"
        loops: root.benchmarkVideoMode ? MediaPlayer.Infinite : 1
        audioOutput: AudioOutput { }
        videoOutput: videoOutput
        onErrorOccurred: function(error: int, errorString: string): void { root.videoError = errorString }
        onPositionChanged: {
            if (root.benchmarkVideoMode && !root.videoReady && position > 100) {
                root.videoReady = true
                if (!root.benchmarkAutoplay)
                    pause()
            }
        }
    }
    header: ToolBar {
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 16
            anchors.rightMargin: 16
            Label { text: "Loofi Creator Studio Native"; font.bold: true; Layout.fillWidth: true }
            Label { text: "M0 prototype · session-only demo projects" }
        }
    }
    footer: ToolBar {
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 16
            anchors.rightMargin: 16
            Label {
                objectName: "commandMessage"
                text: root.rejectedMessage.length > 0 ? root.rejectedMessage : controller.message
                elide: Text.ElideRight
                Layout.fillWidth: true
                Accessible.name: "Command status"
            }
            BusyIndicator { running: controller.status === NativeController.Running; visible: running; implicitWidth: 24; implicitHeight: 24 }
            Button { text: "Cancel command"; visible: controller.status === NativeController.Running; onClicked: controller.cancelCommand() }
        }
    }
    RowLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 24
        ColumnLayout {
            Layout.preferredWidth: 180
            Layout.fillHeight: true
            Button { objectName: "navProjects"; text: "Projects"; Accessible.name: text; Layout.fillWidth: true; checkable: true; checked: root.page === "projects"; onClicked: root.showPage("projects") }
            Button { objectName: "navPrompt"; text: "Prompt Studio"; Accessible.name: text; Layout.fillWidth: true; checkable: true; checked: root.page === "studio"; onClicked: root.showPage("studio") }
            Button { objectName: "navVideo"; text: "Video Preview"; Accessible.name: text; Layout.fillWidth: true; checkable: true; checked: root.page === "video"; onClicked: root.showPage("video") }
            Button { objectName: "navCamera"; text: "Camera Scene"; Accessible.name: text; Layout.fillWidth: true; checkable: true; checked: root.page === "camera"; onClicked: root.showPage("camera") }
            Item { Layout.fillHeight: true }
            Label { text: "Ctrl+1–4: navigate\nCtrl+O: open video"; wrapMode: Text.WordWrap; Layout.fillWidth: true }
        }
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: root.page === "projects" ? 0 : root.page === "studio" ? 1 : root.page === "video" ? 2 : 3
            ColumnLayout {
                spacing: 12
                Label { text: "Projects"; font.pixelSize: 26 }
                Label { text: "Demo projects exist only for this session. Existing Creator Studio projects are not opened."; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                RowLayout {
                    TextField { id: projectName; objectName: "newProjectName"; Accessible.name: "New demo project name"; placeholderText: "Demo project name"; Layout.fillWidth: true; maximumLength: 120; onAccepted: createProjectButton.clicked() }
                    Button {
                        id: createProjectButton
                        objectName: "createProjectButton"
                        text: "Create demo project"
                        enabled: projectName.text.trim().length > 0
                        onClicked: {
                            const projectId = projects.createDemoProject(projectName.text)
                            if (projectId.length > 0) {
                                controller.setSelectedProject(projectId, projects.projectName(projectId))
                                projectName.clear()
                            }
                        }
                    }
                }
                Label { text: projects.errorMessage; visible: text.length > 0; Layout.fillWidth: true; wrapMode: Text.WordWrap }
                ListView {
                    id: projectList
                    objectName: "projectsList"
                    Accessible.name: "Session demo projects"
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    model: projects
                    spacing: 4
                    delegate: ItemDelegate {
                        required property string projectId
                        required property string name
                        width: projectList.width
                        text: name
                        highlighted: controller.selectedProjectId === projectId
                        Accessible.name: "Select project " + name
                        Accessible.role: Accessible.Button
                        onClicked: controller.setSelectedProject(projectId, name)
                    }
                    Label { anchors.centerIn: parent; visible: projects.count === 0; text: "No demo projects yet" }
                    ScrollBar.vertical: ScrollBar { }
                }
            }
            ColumnLayout {
                spacing: 12
                Label { text: "Prompt Studio"; font.pixelSize: 26 }
                Label { text: controller.selectedProjectName.length > 0 ? "Project: " + controller.selectedProjectName : "No demo project selected" }
                Label { text: "Local prompt analysis. No account, network request or AI generation." }
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    TextArea { id: promptInput; objectName: "promptInput"; Accessible.name: "Prompt text"; placeholderText: "Describe a scene, camera movement and visual style…"; wrapMode: TextEdit.Wrap; selectByMouse: true }
                }
                Button { objectName: "analyzeButton"; text: "Analyze prompt locally"; enabled: promptInput.text.trim().length > 0; onClicked: controller.analyzePrompt(promptInput.text) }
                Label { objectName: "analysisResult"; text: controller.analysis; visible: text.length > 0; wrapMode: Text.WordWrap; Layout.fillWidth: true }
            }
            ColumnLayout {
                spacing: 12
                Label { text: "Video Preview"; font.pixelSize: 26 }
                Button { objectName: "openVideoButton"; text: "Open local video…"; onClicked: fileDialog.open() }
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "black"
                    VideoOutput { id: videoOutput; objectName: "videoOutput"; anchors.fill: parent; fillMode: VideoOutput.PreserveAspectFit }
                    Label { anchors.centerIn: parent; text: "Open a local video to preview it"; color: "white"; visible: player.source.toString().length === 0 }
                }
                Label { objectName: "videoError"; text: root.videoError; visible: text.length > 0; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                RowLayout {
                    Button { objectName: "videoPlayButton"; text: player.playbackState === MediaPlayer.PlayingState ? "Pause" : "Play"; enabled: player.source.toString().length > 0; onClicked: player.playbackState === MediaPlayer.PlayingState ? player.pause() : player.play() }
                    Slider { objectName: "videoSeek"; Accessible.name: "Video position"; Layout.fillWidth: true; from: 0; to: Math.max(1, player.duration); value: player.position; enabled: player.seekable; onMoved: player.position = value }
                    Label { text: Math.floor(player.position / 1000) + " / " + Math.floor(player.duration / 1000) + " s" }
                }
            }
            ColumnLayout {
                Label { text: "Camera Scene"; font.pixelSize: 26 }
                Label { text: "A native Qt Quick 3D scene. Camera changes render on demand." }
                Loader { objectName: "cameraLoader"; active: root.page === "camera"; source: "CameraScene.qml"; Layout.fillWidth: true; Layout.fillHeight: true }
            }
        }
    }
}
