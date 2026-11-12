#!/usr/bin/python3
# SPDX-License-Identifier: GPL-3.0-only
"""Exercise only the launched prototype through real AT-SPI on Plasma Wayland."""
import argparse
import json
import os
import pathlib
import signal
import subprocess
import tempfile
import time
import pyatspi

parser = argparse.ArgumentParser()
parser.add_argument("--binary", required=True)
parser.add_argument("--video", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
if os.environ.get("XDG_SESSION_TYPE") != "wayland":
    raise SystemExit("A real Wayland session is required")


def descendants(node, limit=1000):
    pending = [node]
    while pending and limit:
        current = pending.pop(0)
        limit -= 1
        yield current
        try:
            pending.extend(list(current))
        except Exception:
            pass


def wait_for(callback, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        value = callback()
        if value:
            return value
        time.sleep(0.1)
    raise AssertionError("Timed out waiting for accessible UI")


def named(app, name):
    matches = [item for item in descendants(app) if item.name == name]
    for item in matches:
        try:
            if item.queryAction().nActions > 0:
                return item
        except Exception:
            pass
    return matches[0] if matches else None


def click(item):
    action = item.queryAction()
    assert action.nActions > 0
    assert action.doAction(0)


report = {"session": "wayland", "checks": [], "portalRequested": os.environ.get("PLASMA_INTEGRATION_USE_PORTAL", "0")}
with tempfile.TemporaryDirectory(prefix="creator-native-wayland-") as temporary:
    env = dict(os.environ)
    for key, directory in [("XDG_CONFIG_HOME", "config"), ("XDG_DATA_HOME", "data"), ("XDG_CACHE_HOME", "cache"), ("XDG_STATE_HOME", "state")]:
        env[key] = str(pathlib.Path(temporary) / directory)
    env.update(QT_QPA_PLATFORM="wayland", QT_QPA_PLATFORMTHEME="kde", QT_LINUX_ACCESSIBILITY_ALWAYS_ON="1", QT_LOGGING_RULES="qt.quick.dialogs*.debug=true;qt.qpa.theme.debug=true")
    logpath = pathlib.Path(temporary) / "prototype.log"
    with logpath.open("w") as log:
        process = subprocess.Popen([args.binary, "--native-dialog-evidence"], env=env, stdout=log, stderr=log, start_new_session=True)
        try:
            app = wait_for(lambda: next((item for item in pyatspi.Registry.getDesktop(0) if item.get_process_id() == process.pid), None))
            click(wait_for(lambda: named(app, "Projects")))
            name = wait_for(lambda: named(app, "New demo project name"))
            name.queryEditableText().setTextContents("Wayland session demo")
            click(wait_for(lambda: named(app, "Create demo project")))
            click(wait_for(lambda: named(app, "Select project Wayland session demo")))
            report["checks"].append("sessions_project_create")
            click(wait_for(lambda: named(app, "Video Preview")))
            click(wait_for(lambda: named(app, "Open local video…")))
            dialog = wait_for(lambda: next((item for item in descendants(app) if item.getRoleName() == "dialog" and item.getState().contains(pyatspi.STATE_SHOWING)), None))
            report["dialogName"] = dialog.name
            report["dialogTree"] = [{"name": item.name, "role": item.getRoleName()} for item in descendants(dialog)]
            filename_group = wait_for(lambda: next((item for item in descendants(dialog) if item.getRoleName() == "combo box" and item.name == "Name:"), None))
            for item in descendants(filename_group):
                try:
                    item.queryEditableText().setTextContents(str(pathlib.Path(args.video).resolve()))
                    break
                except (NotImplementedError, RuntimeError):
                    continue
            else:
                raise AssertionError("Native filename editor is not accessible")
            click(wait_for(lambda: named(dialog, "Open")))
            wait_for(lambda: not any(item.getRoleName() == "dialog" and item.getState().contains(pyatspi.STATE_SHOWING) for item in descendants(app)))
            report["checks"].append("native_file_dialog_select")
            click(wait_for(lambda: named(app, "Play")))
            wait_for(lambda: named(app, "Pause"))
            click(named(app, "Pause"))
            report["checks"].append("video_play_pause")
            click(named(app, "Open local video…"))
            dialog = wait_for(lambda: next((item for item in descendants(app) if item.getRoleName() == "dialog" and item.getState().contains(pyatspi.STATE_SHOWING)), None))
            click(wait_for(lambda: named(dialog, "Cancel")))
            wait_for(lambda: not any(item.getRoleName() == "dialog" and item.getState().contains(pyatspi.STATE_SHOWING) for item in descendants(app)))
            report["checks"].append("native_file_dialog_cancel")
            click(named(app, "Camera Scene"))
            wait_for(lambda: named(app, "Camera yaw"))
            report["checks"].append("camera_navigation")
        except Exception as error:
            report["status"] = "failed"
            report["failure"] = repr(error)
            if "app" in locals():
                report["failureTree"] = [{"name": item.name, "role": item.getRoleName()} for item in descendants(app)]
        finally:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=10)
    report["qtDialogLog"] = logpath.read_text()
    if report.get("status") != "failed":
        if "NATIVE_DIALOG_HELPER\tKFileWidget" not in report["qtDialogLog"]:
            report["status"] = "failed"
            report["failure"] = "Native dialog helper was not verified"
        else:
            report["status"] = "passed"
            report["nativeHelper"] = "KFileWidget (KDE platform helper, confirmed through public QWidget runtime metadata)"
pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(args.output).write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"status": report["status"], "checks": report["checks"]}))

if report["status"] != "passed":
    raise SystemExit(report.get("failure", "Wayland smoke failed"))
