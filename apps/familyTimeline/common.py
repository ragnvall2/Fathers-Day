"""
This file defines cache, session, and translator T object for the app
These are fixtures that every app needs so probably you will not be editing this file
"""

import os
import sys

from pydal.tools.scheduler import Scheduler
from pydal.tools.tags import Tags

from py4web import DAL, Cache, Field, Flash, Session, Translator, action
from py4web.server_adapters.logging_utils import make_logger
from py4web.utils.auth import Auth
from py4web.utils.downloader import downloader
from py4web.utils.factories import ActionFactory
from py4web.utils.mailer import Mailer

from . import settings

# #######################################################
# implement custom loggers form settings.LOGGERS
# #######################################################
logger = make_logger("py4web:" + settings.APP_NAME, settings.LOGGERS)

# #######################################################
# connect to db
# #######################################################
db = DAL(
    settings.DB_URI,
    folder=settings.DB_FOLDER,
    pool_size=settings.DB_POOL_SIZE,
    migrate=settings.DB_MIGRATE,
    fake_migrate=settings.DB_FAKE_MIGRATE,
)

# #######################################################
# define global objects that may or may not be used by the actions
# #######################################################
cache = Cache(size=1000)
T = Translator(settings.T_FOLDER)

# #######################################################
# pick the session type that suits you best
# #######################################################
if settings.SESSION_TYPE == "cookies":
    session = Session(secret=settings.SESSION_SECRET_KEY)

elif settings.SESSION_TYPE == "redis":
    import redis

    host, port = settings.REDIS_SERVER.split(":")
    # for more options: https://github.com/andymccurdy/redis-py/blob/master/redis/client.py
    conn = redis.Redis(host=host, port=int(port))
    conn.set = (
        lambda k, v, e, cs=conn.set, ct=conn.ttl: cs(k, v, ct(k))
        if ct(k) >= 0
        else cs(k, v, e)
    )
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn)

elif settings.SESSION_TYPE == "memcache":
    import time

    import memcache

    conn = memcache.Client(settings.MEMCACHE_CLIENTS, debug=0)
    session = Session(secret=settings.SESSION_SECRET_KEY, storage=conn)

elif settings.SESSION_TYPE == "database":
    from py4web.utils.dbstore import DBStore

    session = Session(secret=settings.SESSION_SECRET_KEY, storage=DBStore(db))

# #######################################################
# Instantiate the object and actions that handle auth
# #######################################################
auth = Auth(session, db, define_tables=True)  # CHANGED: define_tables=True
auth.use_username = False  # CHANGED: Use email instead of username
auth.param.registration_requires_confirmation = False  # CHANGED: Skip email verification for now
auth.param.registration_requires_approval = False
auth.param.login_after_registration = True  # CHANGED: Auto-login after registration
auth.param.allowed_actions = ["all"]  # CHANGED: Enable all auth actions
auth.param.login_expiration_time = 3600 * 24 * 30  # CHANGED: 30 days
auth.param.password_complexity = {"entropy": 0}  # CHANGED: Simple passwords for development
auth.param.block_previous_password_num = 0  # CHANGED: Allow password reuse for development
auth.param.default_login_enabled = True
auth.define_tables()
auth.fix_actions()

flash = auth.flash

# #######################################################
# Configure email sender for auth (Skip for now)
# #######################################################
# Skip SMTP configuration - we'll add this later
# if settings.SMTP_SERVER:
#     auth.sender = Mailer(
#         server=settings.SMTP_SERVER,
#         sender=settings.SMTP_SENDER,
#         login=settings.SMTP_LOGIN,
#         tls=settings.SMTP_TLS,
#         ssl=settings.SMTP_SSL,
#     )

# #######################################################
# Create a table to tag users as group members
# #######################################################
if auth.db:
    groups = Tags(db.auth_user, "groups")

# #######################################################
# Enable optional auth plugin - Google OAuth setup for later
# #######################################################
# TODO: Add Google OAuth when we get credentials
# if settings.OAUTH2GOOGLE_CLIENT_ID:
#     from py4web.utils.auth_plugins.oauth2google import OAuth2Google
#     auth.register_plugin(
#         OAuth2Google(
#             client_id=settings.OAUTH2GOOGLE_CLIENT_ID,
#             client_secret=settings.OAUTH2GOOGLE_CLIENT_SECRET,
#             callback_url="auth/plugin/oauth2google/callback",
#         )
#     )

# #######################################################
# Define a convenience action to allow users to download
# files uploaded and reference by Field(type='upload')
# #######################################################
if settings.UPLOAD_FOLDER:

    @action("download/<filename>")
    @action.uses(db)
    def download(filename):
        return downloader(db, settings.UPLOAD_FOLDER, filename)

    # To take advantage of this in Form(s)
    # for every field of type upload you MUST specify:
    #
    # field.upload_path = settings.UPLOAD_FOLDER
    # field.download_url = lambda filename: URL('download/%s' % filename)

# #######################################################
# Define and optionally start the scheduler
# #######################################################
if settings.USE_SCHEDULER:
    scheduler = Scheduler(
        db, logger=logger, max_concurrent_runs=settings.SCHEDULER_MAX_CONCURRENT_RUNS
    )
    scheduler.start()
else:
    scheduler = None

# #######################################################
# Enable authentication
# #######################################################
auth.enable(uses=(session, T, db), env=dict(T=T))

# #######################################################
# Define convenience decorators
# They can be used instead of @action and @action.uses
# They should NEVER BE MIXED with @action and @action.uses
# If you need to provide extra fixtures for a specific controller
# add them like this: @authenticated(uses=[extra_fixture])
# #######################################################
unauthenticated = ActionFactory(db, session, T, flash, auth)
authenticated = ActionFactory(db, session, T, flash, auth.user)