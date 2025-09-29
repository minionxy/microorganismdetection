from app import app, db
from flask_migrate import Migrate
from flask_script import Manager

migrate = Migrate(app, db)
manager = Manager(app)

@manager.command
def db():
    """Perform database migrations"""
    from flask_migrate import upgrade, migrate, init, stamp
    import os
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    if not os.path.exists(migrations_dir):
        init()
    stamp()
    migrate()
    upgrade()

if __name__ == '__main__':
    manager.run()