// SPDX-License-Identifier: GPL-3.0-only
#include "smoke.h"
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include <QMediaPlayer>
#include <QVideoSink>
#include <QVideoFrame>
#include <QQuickItem>
#include <QAbstractItemModel>
#include <QAbstractItemModelTester>
#include <QTemporaryDir>
#include <QFile>
#include <QSignalSpy>
#include <QtTest>

class SmokeTests : public QObject {
    Q_OBJECT
public:
    QObject *root;
    QString video;
private slots:
    void bridge()
    {
        auto *controller = root->property("nativeController").value<QObject *>();
        auto *model = qobject_cast<QAbstractItemModel *>(root->property("projectModel").value<QObject *>());
        QVERIFY(controller);
        QVERIFY(model);
        QAbstractItemModelTester tester(model, QAbstractItemModelTester::FailureReportingMode::QtTest);
        QCOMPARE(model->rowCount(), 0);
        QString id;
        QVERIFY(QMetaObject::invokeMethod(model, "createDemoProject", Q_RETURN_ARG(QString, id), Q_ARG(QString, QString("Wayland demo"))));
        QVERIFY(!id.isEmpty());
        QCOMPARE(model->rowCount(), 1);
        QCOMPARE(model->data(model->index(0, 0), Qt::UserRole + 2).toString(), QString("Wayland demo"));
        QVERIFY(QMetaObject::invokeMethod(controller, "setSelectedProject", Q_ARG(QString, id), Q_ARG(QString, QString("Wayland demo"))));
        QCOMPARE(controller->property("selectedProjectName").toString(), QString("Wayland demo"));
        QSignalSpy state(controller, SIGNAL(statusChanged()));
        QVERIFY(state.isValid());
        QVERIFY(QMetaObject::invokeMethod(controller, "analyzePrompt", Q_ARG(QString, QString("A slow camera tracking a blue boat"))));
        QCOMPARE(controller->property("status").toInt(), 1);
        QTRY_COMPARE_WITH_TIMEOUT(controller->property("status").toInt(), 2, 5000);
        QVERIFY(!controller->property("analysis").toString().isEmpty());
        QVERIFY(state.count() >= 2);
        // Submit without pumping events: the second command must be rejected even if the worker is fast.
        QVERIFY(QMetaObject::invokeMethod(controller, "analyzePrompt", Q_ARG(QString, QString("boat ").repeated(20000))));
        const auto command = controller->property("commandId").toUInt();
        QVERIFY(QMetaObject::invokeMethod(controller, "analyzePrompt", Q_ARG(QString, QString("overlapping"))));
        QCOMPARE(controller->property("commandId").toUInt(), command);
        QCOMPARE(controller->property("status").toInt(), 1);
        QVERIFY(QMetaObject::invokeMethod(controller, "cancelCommand"));
        QCOMPARE(controller->property("status").toInt(), 4);
        QTest::qWait(50);
        QCOMPARE(controller->property("status").toInt(), 4);
        QVERIFY(QMetaObject::invokeMethod(controller, "validateVideo", Q_ARG(QUrl, QUrl("https://example.invalid/video.webm"))));
        QTRY_COMPARE_WITH_TIMEOUT(controller->property("status").toInt(), 3, 5000);
        QVERIFY(!controller->property("message").toString().isEmpty());
        QVERIFY(QMetaObject::invokeMethod(root, "showPage", Q_ARG(QString, QString("projects"))));
        QCOMPARE(root->property("page").toString(), QString("projects"));
        QVERIFY(QMetaObject::invokeMethod(root, "showPage", Q_ARG(QString, QString("studio"))));
        // Engine destruction after runSmokeTests also exercises shutdown with queued/in-flight work.
        QVERIFY(QMetaObject::invokeMethod(controller, "analyzePrompt", Q_ARG(QString, QString("camera ").repeated(20000))));
    }
    void visual()
    {
        auto *window = qobject_cast<QQuickWindow *>(root);
        QVERIFY(window);
        QTRY_VERIFY_WITH_TIMEOUT(window->isExposed(), 5000);
        QVERIFY(QMetaObject::invokeMethod(root, "showPage", Q_ARG(QString, QString("camera"))));
        QTRY_VERIFY_WITH_TIMEOUT(root->findChild<QObject *>("cameraViewport"), 5000);
        QTest::qWait(200);
        auto *viewport = root->findChild<QQuickItem *>("cameraViewport");
        QVERIFY(viewport);
        QImage before = window->grabWindow();
        QVERIFY(!before.isNull());
        auto *yaw = root->findChild<QObject *>("cameraYaw");
        QVERIFY(yaw);
        QVERIFY(yaw->setProperty("value", 90));
        QTest::qWait(200);
        QImage after = window->grabWindow();
        // Verify actual rendered geometry: central scene contains more than its flat clear color.
        QSet<QRgb> colors;
        QPointF origin = viewport->mapToScene(QPointF(0, 0));
        qreal scale = window->devicePixelRatio();
        QRect area(qRound(origin.x()*scale), qRound(origin.y()*scale), qRound(viewport->width()*scale), qRound(viewport->height()*scale));
        area = area.intersected(before.rect()).adjusted(10,10,-10,-10);
        QVERIFY(before.copy(area) != after.copy(area));
        for (int y=area.top();y<area.bottom();y+=8)
            for(int x=area.left();x<area.right();x+=8) colors.insert(before.pixel(x,y));
        QVERIFY(colors.size()>3);
        QVERIFY(QFile::exists(video));
        QVERIFY(QMetaObject::invokeMethod(root, "openVideo", Q_ARG(QUrl, QUrl::fromLocalFile(video))));
        auto *player = root->findChild<QMediaPlayer *>("videoPlayer");
        QVERIFY(player);
        QTRY_VERIFY_WITH_TIMEOUT(!player->source().isEmpty(), 5000);
        QTRY_VERIFY_WITH_TIMEOUT(player->videoSink(), 5000);
        int validFrames = 0;
        auto frameConnection = QObject::connect(player->videoSink(), &QVideoSink::videoFrameChanged, this,
             [&validFrames](const QVideoFrame &frame) { if(frame.isValid()) ++validFrames; });
        player->play();
        QTRY_VERIFY_WITH_TIMEOUT(validFrames >= 2, 10000);
        QTRY_VERIFY_WITH_TIMEOUT(player->position()>200, 5000);
        player->pause();
        QCOMPARE(player->playbackState(), QMediaPlayer::PausedState);
        player->setPosition(1500);
        QTRY_VERIFY_WITH_TIMEOUT(player->position()>=1400, 5000);
        QObject::disconnect(frameConnection);
        QVERIFY(QMetaObject::invokeMethod(root, "showPage", Q_ARG(QString, QString("studio"))));
        QTRY_VERIFY(player->source().isEmpty());
        QTemporaryDir temporary;
        QFile invalid(temporary.filePath("invalid.webm"));
        QVERIFY(invalid.open(QIODevice::WriteOnly));
        invalid.write("This is not a video"); invalid.close();
        QVERIFY(QMetaObject::invokeMethod(root, "openVideo", Q_ARG(QUrl, QUrl::fromLocalFile(invalid.fileName()))));
        QTRY_VERIFY_WITH_TIMEOUT(!root->property("videoError").toString().isEmpty(), 10000);
    }
};

int runSmokeTests(QQmlApplicationEngine &engine, const QString &suite, const QString &video)
{
    SmokeTests tests;
    tests.root = engine.rootObjects().first();
    tests.video = video;
    QByteArray method = suite.toUtf8();
    char program[] = "native-smoke";
    char *args[] = {program, method.data()};
    return QTest::qExec(&tests, 2, args);
}
#include "smoke.moc"
