# SPDX-License-Identifier: GPL-3.0-only
cmake_minimum_required(VERSION 3.24)
project(LoofiCreatorStudioNative VERSION 0.1.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(ENV{QMAKE} /usr/bin/qmake6)
find_package(Qt6 6.11 REQUIRED COMPONENTS Core Gui Widgets Qml Quick QuickControls2 Multimedia Quick3D Test)
qt_standard_project_setup(REQUIRES 6.11)
include(FetchContent)
FetchContent_Declare(CxxQt
 URL https://codeload.github.com/KDAB/cxx-qt-cmake/tar.gz/refs/tags/0.10.0
 URL_HASH SHA256=bbf0095649d820d26ebcd91fbfbef3dbc2894de4dd10066c46927388abceacd3
 DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_MakeAvailable(CxxQt)
cxx_qt_import_crate(MANIFEST_PATH Cargo.toml CRATES creator_native_bridge LOCKED
 QT_MODULES Qt::Core Qt::Gui Qt::Qml Qt::Quick)
cxx_qt_import_qml_module(native_backend URI "Loofi.Native" SOURCE_CRATE creator_native_bridge)
qt_add_executable(loofi-creator-studio-native cpp/main.cpp cpp/smoke.cpp cpp/smoke.h)
qt_add_qml_module(loofi-creator-studio-native URI Loofi.Native.App VERSION 1.0
 IMPORT_PATH ${CMAKE_CURRENT_BINARY_DIR}/cxxqt/qml_modules
 QML_FILES qml/Main.qml qml/CameraScene.qml)
target_link_libraries(loofi-creator-studio-native PRIVATE native_backend Qt6::Widgets Qt6::QuickControls2 Qt6::Multimedia Qt6::Quick3D Qt6::Test)
qt_import_qml_plugins(loofi-creator-studio-native)
include(CTest)
if(BUILD_TESTING)
 add_test(NAME native_bridge_smoke COMMAND loofi-creator-studio-native --smoke-test bridge)
 add_test(NAME native_visual_smoke COMMAND loofi-creator-studio-native --smoke-test visual --video ${CMAKE_CURRENT_BINARY_DIR}/fixtures/test.webm)
 set_tests_properties(native_bridge_smoke native_visual_smoke PROPERTIES TIMEOUT 60 ENVIRONMENT "QSG_RHI_BACKEND=opengl;LIBGL_ALWAYS_SOFTWARE=1;XDG_CONFIG_HOME=${CMAKE_CURRENT_BINARY_DIR}/test-profile/config;XDG_DATA_HOME=${CMAKE_CURRENT_BINARY_DIR}/test-profile/data;XDG_CACHE_HOME=${CMAKE_CURRENT_BINARY_DIR}/test-profile/cache;XDG_STATE_HOME=${CMAKE_CURRENT_BINARY_DIR}/test-profile/state")
 find_package(Python3 REQUIRED COMPONENTS Interpreter)
 add_test(NAME native_fixture COMMAND ${Python3_EXECUTABLE} ${CMAKE_CURRENT_SOURCE_DIR}/scripts/create_fixture.py ${CMAKE_CURRENT_BINARY_DIR}/fixtures/test.webm)
 set_tests_properties(native_fixture PROPERTIES FIXTURES_SETUP video)
 set_tests_properties(native_visual_smoke PROPERTIES FIXTURES_REQUIRED video)
endif()
install(TARGETS loofi-creator-studio-native RUNTIME DESTINATION bin)
