import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("SQLAlchemy database engine initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize SQLAlchemy database engine: {e}", exc_info=True)
    engine = None
    SessionLocal = None

def get_db():
    """
    FastAPI dependency that provides a database session per request.
    Yields a SQLAlchemy Session instance and ensures cleanup after request.
    """
    if SessionLocal is None:
        logger.error("Database SessionLocal is not initialized.")
        raise RuntimeError("Database connection is not available.")
    
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session exception encountered: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    """
    Creates all database tables defined in SQLAlchemy models if they do not exist.
    """
    if engine is None:
        logger.error("Cannot initialize database tables: engine is None.")
        return False
    try:
        # Import models so they register with Base.metadata before create_all
        import app.models.db_models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Error creating database tables: {e}", exc_info=True)
        return False
