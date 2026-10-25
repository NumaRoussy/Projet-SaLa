import csv
import sqlite3

def import_csv_to_db(csv_path: str, db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT NOT NULL,
        mode TEXT,
        category TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        extra TEXT,
        sips INTEGER DEFAULT 0,
        loss_percent REAL DEFAULT 0.0,
        min_players INTEGER DEFAULT 2
    )
    """)
    # Migrations légères si la table existait
    try:
        cur.execute("ALTER TABLE cards ADD COLUMN mode TEXT")
    except Exception:
        pass
    try:
        cur.execute("ALTER TABLE cards ADD COLUMN loss_percent REAL DEFAULT 0.0")
    except Exception:
        pass

    cur.execute("DELETE FROM cards")  # Remplacement intégral

    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        records = []
        for row in reader:
            if not row.get("game") or not row.get("content"):
                continue
            try:
                loss_val = float(row.get("loss_percent") or 0.0)
            except ValueError:
                loss_val = 0.0
            records.append(
                (
                    row["game"],
                    row.get("mode") or "",
                    row.get("category") or "",
                    row.get("title") or "",
                    row["content"],
                    row.get("extra") or "",
                    int(row.get("sips") or 0),
                    loss_val,
                    int(row.get("min_players") or 2),
                )
            )

    cur.executemany(
        """INSERT INTO cards (game, mode, category, title, content, extra, sips, loss_percent, min_players)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        records
    )
    conn.commit()
    conn.close()
    print(f"[IMPORT] {len(records)} cartes importées avec succès dans la base {db_path}.")

if __name__ == "__main__":
    import_csv_to_db("./data/content.csv", "./data/scoutgame.db")
