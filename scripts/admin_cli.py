#!/usr/bin/env bash
"""true" '''
exec python3 "$0" "$@"
'''
"""
import sys
import os
import sqlite3
import hashlib
import datetime
import argparse
import re

DEFAULT_DB = os.environ.get("DB_PATH", "./data/scoutgame.db")

OFFICIAL_TEXT = "Pour les carnotzets, troisièmes mi-temps et fins de journée de maîtrise. Scannez discrètement. Faites tourner uniquement entre chefs."


def get_db(db_path: str = DEFAULT_DB) -> sqlite3.Connection:
    if not os.path.exists(db_path):
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)


def cmd_ag_create(args):
    conn = get_db(args.db)
    cur = conn.cursor()

    camp_name = args.name.strip()
    slug = slugify(camp_name)
    camp_id = args.id.strip() if args.id else (slug if slug.startswith("ag-") else f"ag-{slug}")
    token = args.token.strip() if args.token else f"AG-{os.urandom(4).hex().upper()}"
    hours = args.hours

    expires_at = (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=hours)
    ).strftime("%Y-%m-%d %H:%M:%S")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    cur.execute(
        """INSERT OR REPLACE INTO bootstrap_campaigns
           (id, name, token_hash, is_active, expires_at, created_at)
           VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)""",
        (camp_id, camp_name, token_hash, expires_at),
    )
    conn.commit()

    domain = args.domain.rstrip("/")
    bootstrap_url = f"{domain}/?bootstrap={token}"

    # Générer le SVG QR Code
    qr_svg = ""
    try:
        import qrcode
        import qrcode.image.svg
        factory = qrcode.image.svg.SvgImage
        img = qrcode.make(bootstrap_url, image_factory=factory, box_size=8)
        svg_bytes = img.to_string()
        qr_svg = svg_bytes.decode("utf-8")
        # Enlever la déclaration xml pour inclusion propre dans le html
        qr_svg = re.sub(r"<\?xml.*?\?>", "", qr_svg).strip()
    except Exception as e:
        qr_svg = f"<p style='color:red'>QR Code Generator: {e}</p>"

    # Générer data/ag_print_sheet.html
    html_output_path = os.path.join(os.path.dirname(os.path.abspath(args.db)), "ag_print_sheet.html")
    
    strips_html = ""
    for idx in range(8):
        strips_html += f"""
        <div class="strip">
            <div class="qr-col">
                {qr_svg}
            </div>
            <div class="content-col">
                <div class="strip-header">
                    <span class="badge">⚜️ ESPACE MAÎTRISE</span>
                    <span class="camp-name">{camp_name}</span>
                </div>
                <div class="official-quote">
                    « {OFFICIAL_TEXT} »
                </div>
                <div class="strip-footer">
                    <span>{domain}</span>
                    <span class="cut">✂️ Découper</span>
                </div>
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Planche QR — {camp_name} (Scout Game)</title>
    <style>
        @page {{
            size: A4 portrait;
            margin: 10mm;
        }}
        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            margin: 0;
            padding: 0;
        }}
        .no-print {{
            background: #1f2937;
            color: white;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 14px;
        }}
        .btn {{
            background: #059669;
            color: white;
            border: none;
            padding: 8px 16px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 10px;
        }}
        .strip {{
            border: 2px dashed #6b7280;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            background: #ffffff;
            page-break-inside: avoid;
            height: 140px;
        }}
        .qr-col {{
            width: 90px;
            height: 90px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}
        .qr-col svg {{
            width: 90px;
            height: 90px;
        }}
        .content-col {{
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
        }}
        .strip-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .badge {{
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #111827;
        }}
        .camp-name {{
            font-size: 10px;
            color: #4b5563;
            font-family: monospace;
        }}
        .official-quote {{
            font-size: 10px;
            line-height: 1.35;
            font-style: italic;
            color: #1f2937;
            margin: 4px 0;
            font-weight: 500;
        }}
        .strip-footer {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: #6b7280;
            font-family: monospace;
        }}
        @media print {{
            .no-print {{
                display: none !important;
            }}
            .grid {{
                padding: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="no-print">
        <div>
            <strong>Planche d'amorce QR : {camp_name}</strong> (Expire le {expires_at})
        </div>
        <button class="btn" onclick="window.print()">🖨️ Imprimer la planche (A4)</button>
    </div>
    <div class="grid">
        {strips_html}
    </div>
</body>
</html>
"""
    with open(html_output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print("=" * 60)
    print(f"⚜️ CAMPAGNE D'AMORCE CRÉÉE AVEC SUCCÈS")
    print(f"  Nom        : {camp_name}")
    print(f"  ID         : {camp_id}")
    print(f"  Jeton brut : {token}")
    print(f"  Hash SHA256: {token_hash}")
    print(f"  Validité   : {hours}h (jusqu'au {expires_at} UTC)")
    print(f"  URL Direct : {bootstrap_url}")
    print(f"  Planche A4 : file://{html_output_path}")
    print("=" * 60)


def cmd_ag_close(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    camp_id = args.id.strip()

    cur.execute("UPDATE bootstrap_campaigns SET is_active = 0 WHERE id = ?", (camp_id,))
    conn.commit()

    if cur.rowcount > 0:
        print(f"✅ Campagne '{camp_id}' désactivée avec succès (is_active = 0).")
    else:
        print(f"⚠️ Aucune campagne trouvée avec l'ID '{camp_id}'.")


def cmd_blackout_on(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_active', 'true', CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = CURRENT_TIMESTAMP"""
    )
    conn.commit()
    print("🚨 COUPE-CIRCUIT ACTIVÉ : L'espace festif Face B est maintenant verrouillé.")


def cmd_blackout_off(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_active', 'false', CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = 'false', updated_at = CURRENT_TIMESTAMP"""
    )
    conn.commit()
    print("✅ COUPE-CIRCUIT DÉSACTIVÉ : L'accès à la Face B est rétabli.")


def cmd_blackout_dates(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    start = args.start.strip()
    end = args.end.strip()

    cur.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_start', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (start,),
    )
    cur.execute(
        """INSERT INTO system_config (key, value, updated_at)
           VALUES ('camp_blackout_end', ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP""",
        (end,),
    )
    conn.commit()
    print(f"📅 Dates de camp programmées : du {start} au {end} (inclus).")


def cmd_blackout_status(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    cur.execute(
        "SELECT key, value FROM system_config WHERE key IN ('camp_blackout_active', 'camp_blackout_start', 'camp_blackout_end')"
    )
    rows = dict(cur.fetchall())
    manual = rows.get("camp_blackout_active", "false").lower() == "true"
    start = rows.get("camp_blackout_start") or "Non défini"
    end = rows.get("camp_blackout_end") or "Non défini"

    today = datetime.date.today().isoformat()
    date_active = False
    if rows.get("camp_blackout_start") and rows.get("camp_blackout_end"):
        date_active = rows["camp_blackout_start"] <= today <= rows["camp_blackout_end"]

    effective = manual or date_active

    print("=" * 50)
    print("⛺ STATUT DU COUPE-CIRCUIT DE CAMP :")
    print(f"  Interrupteur d'urgence manuel : {'ACTIVÉ (true)' if manual else 'Désactivé (false)'}")
    print(f"  Plage programmée              : {start} -> {end}")
    print(f"  Date du jour                  : {today}")
    print(f"  Blackout par dates            : {'ACTIF' if date_active else 'Inactif'}")
    print(f"  STATUT EFFECTIF               : {'🚨 VERROUILLÉ (Sobriété camp)' if effective else '✅ ACCÈS OUVERT'}")
    print("=" * 50)


def cmd_reports(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, target_device_id, reason, reporter_name, status, created_at FROM revocation_reports ORDER BY created_at DESC"
    )
    rows = cur.fetchall()
    print(f"🚨 SIGNALEMENTS ENREGISTRÉS ({len(rows)}) :")
    if not rows:
        print("  (Aucun signalement dans la base)")
        return
    for r in rows:
        status_icon = "⏳" if r[4] == "PENDING" else ("🪓" if r[4] == "APPROVED" else "❌")
        print(f"  [{status_icon} ID {r[0]}] Device: {r[1]} | Statut: {r[4]} | Par: {r[3] or 'Anonyme'} | Date: {r[5]}")
        print(f"     Motif : {r[2]}")


def cmd_prune(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    target_id = args.device.strip()
    reason = args.reason.strip() if args.reason else "Sciage manuel CLI admin"

    query = """
    WITH RECURSIVE Descendants AS (
        SELECT id FROM devices WHERE id = ?
        UNION ALL
        SELECT d.id FROM devices d
        INNER JOIN Descendants desc ON d.parent_device_id = desc.id
    )
    SELECT id FROM Descendants;
    """
    cur.execute(query, (target_id,))
    descendants = [r[0] for r in cur.fetchall()]

    if not descendants:
        print(f"⚠️ Appareil '{target_id}' introuvable dans la table devices.")
        return

    placeholders = ",".join("?" for _ in descendants)
    update_sql = f"""
    UPDATE devices
    SET is_revoked = 1,
        revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = ?
    WHERE id IN ({placeholders})
    """
    cur.execute(update_sql, [reason] + descendants)
    conn.commit()

    print(f"🪓 SCIAGE TERMINÉ : {len(descendants)} appareil(s) révoqué(s) avec succès dans la branche.")


def cmd_import_cards(args):
    conn = get_db(args.db)
    cur = conn.cursor()
    import csv

    csv_path = args.csv
    if not os.path.exists(csv_path):
        print(f"❌ Fichier introuvable : {csv_path}")
        sys.exit(1)

    cur.execute("""
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
    cur.execute("DELETE FROM cards")

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = [
            (
                row["game"],
                row.get("category") or "",
                row.get("title") or "",
                row["content"],
                row.get("extra") or "",
                int(row.get("sips") or 0),
                int(row.get("min_players") or 2),
            )
            for row in reader
            if row.get("game") and row.get("content")
        ]

    cur.executemany(
        """INSERT INTO cards (game, category, title, content, extra, sips, min_players)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        records,
    )
    conn.commit()
    print(f"🃏 IMPORTATION RÉUSSIE : {len(records)} cartes importées dans '{args.db}'.")


def main():
    parser = argparse.ArgumentParser(description="Scout Game Admin CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ag-create
    p_ag_create = subparsers.add_parser("ag-create", help="Créer une campagne d'amorce AG et générer la planche A4")
    p_ag_create.add_argument("--name", required=True, help="Nom de l'AG ou événement")
    p_ag_create.add_argument("--hours", type=int, default=24, help="Durée de validité en heures (défaut 24)")
    p_ag_create.add_argument("--id", default="", help="Identifiant personnalisé de la campagne")
    p_ag_create.add_argument("--token", default="", help="Token secret en clair (optionnel, auto-généré si omis)")
    p_ag_create.add_argument("--domain", default="https://scoutgame.ch", help="Domaine racine (défaut https://scoutgame.ch)")
    p_ag_create.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_ag_create.set_defaults(func=cmd_ag_create)

    # ag-close
    p_ag_close = subparsers.add_parser("ag-close", help="Clôturer une campagne d'amorce")
    p_ag_close.add_argument("--id", required=True, help="ID de la campagne")
    p_ag_close.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_ag_close.set_defaults(func=cmd_ag_close)

    # blackout-on
    p_bo_on = subparsers.add_parser("blackout-on", help="Activer le coupe-circuit de camp manuel")
    p_bo_on.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_bo_on.set_defaults(func=cmd_blackout_on)

    # blackout-off
    p_bo_off = subparsers.add_parser("blackout-off", help="Désactiver le coupe-circuit manuel")
    p_bo_off.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_bo_off.set_defaults(func=cmd_blackout_off)

    # blackout-dates
    p_bo_dates = subparsers.add_parser("blackout-dates", help="Programmer les dates de blackout")
    p_bo_dates.add_argument("--start", required=True, help="Date début (YYYY-MM-DD)")
    p_bo_dates.add_argument("--end", required=True, help="Date fin (YYYY-MM-DD)")
    p_bo_dates.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_bo_dates.set_defaults(func=cmd_blackout_dates)

    # blackout-status
    p_bo_stat = subparsers.add_parser("blackout-status", help="Afficher l'état du coupe-circuit")
    p_bo_stat.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_bo_stat.set_defaults(func=cmd_blackout_status)

    # reports
    p_reps = subparsers.add_parser("reports", help="Lister les signalements de terrain")
    p_reps.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_reps.set_defaults(func=cmd_reports)

    # prune
    p_prune = subparsers.add_parser("prune", help="Scier une branche d'appareils")
    p_prune.add_argument("--device", required=True, help="UUID de l'appareil à révoquer")
    p_prune.add_argument("--reason", default="Sciage manuel CLI", help="Motif de révocation")
    p_prune.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_prune.set_defaults(func=cmd_prune)

    # import-cards
    p_import = subparsers.add_parser("import-cards", help="Importer le catalogue CSV")
    p_import.add_argument("--csv", default="./data/content.csv", help="Chemin du CSV")
    p_import.add_argument("--db", default=DEFAULT_DB, help="Chemin vers scoutgame.db")
    p_import.set_defaults(func=cmd_import_cards)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
