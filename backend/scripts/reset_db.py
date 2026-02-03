import os
import sys
import argparse

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import Base, engine  # noqa: E402
from models import (  # noqa: F401,E402
    User,
    Category,
    Product,
    Order,
    OrderItem,
    Review,
    Slide,
    Main7Item,
    Main8Content,
    Main6Content,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true", help="Confirm dropping all tables")
    args = parser.parse_args()

    if not args.yes:
        print("Aborted. Use --yes to drop and recreate all tables.")
        return

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset complete.")


if __name__ == "__main__":
    main()
