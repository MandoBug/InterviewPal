terminal_reporter = None


def pytest_configure(config):
    global terminal_reporter
    terminal_reporter = config.pluginmanager.get_plugin("terminalreporter")


def pytest_runtest_logreport(report):
    if report.when != "call" or "tests/test_profile.py" not in report.nodeid:
        return

    if report.passed:
        status = "passed"
    elif report.failed:
        status = "failed"
    else:
        status = "skipped"

    test_name = report.nodeid.rsplit("::", 1)[-1]
    terminal_reporter.write_line(f"{test_name}: {status}")
