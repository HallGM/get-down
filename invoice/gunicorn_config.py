"""Gunicorn configuration for production deployment."""

import os

# Server configuration
bind = f"0.0.0.0:{os.getenv('PORT', 8000)}"
workers = 3
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "invoice-app"

# Server mechanics
daemon = False  # Keep foreground for container environments
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed, configure on Render directly)
# keyfile = None
# certfile = None

# Application settings
reload = os.getenv('FLASK_ENV') == 'development'
reload_extra_files = []
preload_app = False
