// SPDX-License-Identifier: GPL-3.0-only
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick3D

ColumnLayout {
    id: scene
    spacing: 12
    View3D {
        id: viewport
        objectName: "cameraViewport"
        Layout.fillWidth: true
        Layout.fillHeight: true
        environment: SceneEnvironment {
            backgroundMode: SceneEnvironment.Color
            clearColor: "#20252c"
        }
        Node {
            eulerRotation: Qt.vector3d(-20, yaw.value, 0)
            PerspectiveCamera {
                id: camera
                z: distance.value
                fieldOfView: fov.value
                clipNear: 1
                clipFar: 3000
            }
        }
        camera: camera
        DirectionalLight {
            eulerRotation: Qt.vector3d(-45, -35, 0)
            brightness: 1.2
        }
        Model {
            source: "#Cube"
            y: 20
            materials: PrincipledMaterial { baseColor: "#6d9ac5"; roughness: 0.6 }
        }
        Model {
            source: "#Rectangle"
            y: -31
            eulerRotation.x: -90
            scale: Qt.vector3d(6, 6, 6)
            materials: PrincipledMaterial { baseColor: "#637065"; roughness: 1 }
        }
    }
    GridLayout {
        columns: 3
        Layout.fillWidth: true
        Label { text: "Camera yaw" }
        Slider {
            id: yaw
            objectName: "cameraYaw"
            Accessible.name: "Camera yaw"
            Layout.fillWidth: true
            from: -180; to: 180; value: 25
        }
        Label { text: Math.round(yaw.value) + "°"; Layout.minimumWidth: 70 }
        Label { text: "Camera distance" }
        Slider {
            id: distance
            objectName: "cameraDistance"
            Accessible.name: "Camera distance"
            Layout.fillWidth: true
            from: 180; to: 900; value: 450
        }
        Label { text: Math.round(distance.value).toString() }
        Label { text: "Field of view" }
        Slider {
            id: fov
            objectName: "cameraFov"
            Accessible.name: "Camera field of view"
            Layout.fillWidth: true
            from: 20; to: 100; value: 45
        }
        Label { text: Math.round(fov.value) + "°" }
    }
}
