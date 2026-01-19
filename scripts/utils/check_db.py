"""
Утилита для проверки схемы базы данных PostgreSQL.

Проверяет подключение к БД и выводит информацию о таблицах и колонках.
"""

import os

import psycopg2


def get_postgres_url() -> str:
    """Формирует URL подключения к PostgreSQL из переменных окружения."""
    return os.getenv(
        "POSTGRES_URL",
        (
            f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:"
            f"{os.getenv('POSTGRES_PASSWORD', 'password')}"
            f"@{os.getenv('POSTGRES_HOST', 'localhost')}:"
            f"{os.getenv('POSTGRES_PORT', '5432')}/"
            f"{os.getenv('POSTGRES_DB', 'postgres')}"
        ),
    )


def check_schema() -> None:
    """Проверяет схему БД и выводит информацию о таблицах."""
    try:
        conn = psycopg2.connect(get_postgres_url())
        cur = conn.cursor()

        # Получаем список таблиц
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public';"
        )
        tables = cur.fetchall()
        print(f"Таблицы: {tables}")

        # Выводим колонки для каждой таблицы
        for table in tables:
            tname = table[0]
            cur.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = %s;",
                (tname,),
            )
            cols = cur.fetchall()
            print(f"Колонки в {tname}: {cols}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Ошибка: {e}")


if __name__ == "__main__":
    check_schema()
