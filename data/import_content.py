import csv
import aiosqlite
import asyncio

async def import_csv_to_db(csv_path: str, db_path: str):
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            extra TEXT,
            sips INTEGER DEFAULT 0,
            min_players INTEGER DEFAULT 2
        )
        """)
        await db.execute("DELETE FROM cards")  # Remplacement intégral

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            records = [
                (
                    row["game"],
                    row["category"],
                    row.get("title") or "",
                    row["content"],
                    row.get("extra") or "",
                    int(row.get("sips") or 0),
                    int(row.get("min_players") or 2)
                )
                for row in reader
            ]

        await db.executemany(
            """INSERT INTO cards (game, category, title, content, extra, sips, min_players)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            records
        )
        await db.commit()
        print(f"[IMPORT] {len(records)} cartes importées avec succès dans la base.")

if __name__ == "__main__":
    asyncio.run(import_csv_to_db("./data/content.csv", "./data/scoutgame.db"))
