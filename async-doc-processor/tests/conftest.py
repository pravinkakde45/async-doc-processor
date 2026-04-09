import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# Force settings for tests
os.environ["APP_ENV"] = "test"
os.environ["DEBUG"] = "true"

# Determine test database URL
original_url = settings.database_url
if "doc_processor" in original_url and "test" not in original_url:
    TEST_DATABASE_URL = original_url.replace("doc_processor", "doc_processor_test")
else:
    TEST_DATABASE_URL = original_url

# Temporary engine to create/drop DB (connects to postgres default db)
from sqlalchemy import text

def _create_test_db():
    base_url = TEST_DATABASE_URL.rsplit('/', 1)[0]
    dbname = TEST_DATABASE_URL.rsplit('/', 1)[1]
    
    # connect to the default 'postgres' database to create the new one
    temp_engine = create_engine(f"{base_url}/postgres", isolation_level="AUTOCOMMIT")
    with temp_engine.connect() as conn:
        result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'"))
        if not result.scalar():
            conn.execute(text(f"CREATE DATABASE {dbname}"))

_create_test_db()

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create tables before tests, drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    # Dropping tables between tests is safer, but session setup drops all at end
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Returns a clean database session and rolls back after test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Test client with db override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
