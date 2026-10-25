// SPDX-License-Identifier: GPL-3.0-only
#include <QApplication>
#include <QCommandLineParser>
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include <QTimer>
#include <QMediaPlayer>
#include <QVideoSink>
#include <QVideoFrame>
#include <memory>
#include <QWidget>
#include <QSGRendererInterface>
#include <QUrl>
#include <cstdio>
#include "smoke.h"

int main(int argc, char **argv)
{
    QApplication app(argc, argv);
    QCoreApplication::setApplicationName("Loofi Creator Studio Native");
    QCoreApplication::setOrganizationName("Loofi");
    QGuiApplication::setDesktopFileName("dev.loofi.CreatorStudioNative");
    QCommandLineParser parser;
    parser.addHelpOption();
    parser.addOption({"native-dialog-evidence", "Log native KDE widget helper for automated platform tests"});
    parser.addOption({"benchmark", "Enable benchmark scenario hooks"});
    parser.addOption({"smoke-test", "Run automated Qt integration tests", "suite"});
    parser.addOption({"video", "Local video fixture", "path"});
    parser.addOption({"benchmark-scenario", "Run isolated benchmark workload", "scenario"});
    parser.process(app);
    QQmlApplicationEngine engine;
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed,
                     &app, [] { QCoreApplication::exit(2); }, Qt::QueuedConnection);
    engine.loadFromModule("Loofi.Native.App", "Main");
    if (engine.rootObjects().isEmpty()) return 2;
    auto *root = engine.rootObjects().first();
    auto *window = qobject_cast<QQuickWindow *>(root);
    if (!window) return 2;
    if (parser.isSet("native-dialog-evidence")) {
        auto *dialogMonitor = new QTimer(&app);
        dialogMonitor->setInterval(100);
        QObject::connect(dialogMonitor, &QTimer::timeout, root, [] {
            for (auto *widget : QApplication::allWidgets()) {
                if (widget->isVisible() && widget->inherits("KFileWidget")) {
                    std::puts("NATIVE_DIALOG_HELPER\tKFileWidget");
                    std::fflush(stdout);
                    break;
                }
            }
        });
        dialogMonitor->start();
    }
    if (parser.isSet("benchmark-scenario")) {
        const auto scenario = parser.value("benchmark-scenario");
        const QString page = scenario == "projects" ? "projects" :
            scenario.startsWith("video-") ? "video" : "studio";
        QMetaObject::invokeMethod(root, "showPage", Q_ARG(QString, page));
        auto frameSeen = std::make_shared<bool>(false);
        auto *player = root->findChild<QMediaPlayer *>("videoPlayer");
        if (scenario.startsWith("video-") && player && player->videoSink()) {
            QObject::connect(player->videoSink(), &QVideoSink::videoFrameChanged, root, [frameSeen](const QVideoFrame &frame) {
                if (frame.isValid() && frame.width() == 1280 && frame.height() == 720) *frameSeen = true;
            });
        }
        if (scenario.startsWith("video-")) {
            root->setProperty("benchmarkAutoplay", scenario == "video-playing");
            root->setProperty("benchmarkVideoMode", true);
            QMetaObject::invokeMethod(root, "openVideo", Q_ARG(QUrl, QUrl::fromLocalFile(parser.value("video"))));
        }
        auto *ready = new QTimer(&app);
        ready->setInterval(10);
        QObject::connect(ready, &QTimer::timeout, &app, [root, window, ready, scenario, frameSeen, player] {
            if (!window->isExposed()) return;
            if (scenario.startsWith("video-") && (!root->property("videoReady").toBool() || !*frameSeen)) return;
            if (scenario == "video-playing" && player->playbackState() != QMediaPlayer::PlayingState) return;
            if (scenario == "video-paused" && player->playbackState() != QMediaPlayer::PausedState) return;
            ready->stop();
            QObject::connect(window, &QQuickWindow::frameSwapped, root, [scenario, window] {
                const auto api = window->rendererInterface()->graphicsApi();
                const char *backend = api == QSGRendererInterface::OpenGL ? "OpenGL" : api == QSGRendererInterface::Vulkan ? "Vulkan" : api == QSGRendererInterface::Software ? "Software" : "Other";
                std::printf("NATIVE_PLATFORM\t%s\nNATIVE_RENDER_BACKEND\t%s\n", QGuiApplication::platformName().toUtf8().constData(), backend);
                std::printf("NATIVE_READY\t%s\n", scenario.toUtf8().constData());
                std::fflush(stdout);
            }, Qt::SingleShotConnection);
            window->update();
        });
        ready->start();
        if (scenario.startsWith("video-") && player) {
            auto *monitor = new QTimer(&app);
            monitor->setInterval(1000);
            QObject::connect(monitor, &QTimer::timeout, root, [player, root, scenario] {
                if (!root->property("videoReady").toBool()) return;
                const auto expected = scenario == "video-playing" ? QMediaPlayer::PlayingState : QMediaPlayer::PausedState;
                if (player->playbackState() != expected) {
                    std::printf("NATIVE_WORKLOAD_INVALID\t%s\n", scenario.toUtf8().constData());
                    std::fflush(stdout);
                }
            });
            monitor->start();
        }
    }
    if (parser.isSet("smoke-test")) {
        QTimer::singleShot(0, &app, [&] {
            app.exit(runSmokeTests(engine, parser.value("smoke-test"), parser.value("video")));
        });
    }
    return app.exec();
}
