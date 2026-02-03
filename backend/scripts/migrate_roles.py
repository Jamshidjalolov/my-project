import os
import sys
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))


def main():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    db_url = None
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip()
                    break

    if not db_url:
        raise SystemExit("DATABASE_URL not found in backend/.env")

    engine = create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb"
            )
        )
        conn.execute(
            text(
                "UPDATE users SET roles = to_jsonb(ARRAY[role]) "
                "WHERE roles IS NULL OR jsonb_array_length(roles) = 0"
            )
        )
        conn.execute(text("ALTER TABLE users ALTER COLUMN roles SET NOT NULL"))
    print("User roles migration complete.")


if __name__ == "__main__":
    main()
