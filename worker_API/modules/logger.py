import logging
from systemd.journal import JournalHandler
from colorlog import ColoredFormatter

#Log Format, colored format
log_formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
log_formatter_colored = ColoredFormatter("%(asctime)s | %(log_color)s%(levelname)s%(reset)s | %(message)s%(reset)s")

#Setup Journal Handler (Linux/Unix systemd log)
journal_handler = JournalHandler()

#Setup Stream Handler (i.e. console)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter_colored)

#Get our app_logger
app_log = logging.getLogger('Replicator')
app_log.setLevel(logging.DEBUG)

#Add Handlers
app_log.addHandler(journal_handler)
app_log.addHandler(stream_handler)
app_log.propagate = False

def logFile(fileOutput):
    # create file handler for logger.
    file_handler = logging.FileHandler(fileOutput)
    file_handler.setLevel(level=logging.DEBUG)
    file_handler.setFormatter(log_formatter )
    app_log.addHandler(file_handler)
