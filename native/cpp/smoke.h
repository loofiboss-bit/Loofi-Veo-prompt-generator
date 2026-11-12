// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <QString>
class QQmlApplicationEngine;
int runSmokeTests(QQmlApplicationEngine &engine, const QString &suite, const QString &video);
