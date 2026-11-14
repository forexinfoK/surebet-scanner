SUREBET SCANNER MOBILE v1.0.2

Dies ist eine installierbare Android-Web-App (PWA), noch keine native APK.

INSTALLATION / TEST:
1. Dateien auf einen HTTPS-Webhost laden (z.B. GitHub Pages).
2. Die veröffentlichte HTTPS-Adresse in Chrome auf Android öffnen.
3. Chrome-Menü > „App installieren“ oder „Zum Startbildschirm hinzufügen“.
4. App starten und „Jetzt suchen“ drücken.

WICHTIG:
- Die App fragt TipsAudit und Skorbot direkt aus dem Browser ab.
- Browserzugriffe können durch CORS-Regeln der Anbieter blockiert sein. Die App zeigt dann den Fehler an. In diesem Fall braucht es einen kleinen HTTPS-Proxy/Backend, bevor die App zuverlässig nutzbar ist.
- X1/X2-Werte werden aus 1X2-Modellwahrscheinlichkeiten abgeleitet, nicht unabhängig modelliert.
- Verlauf der bereits gezeigten Spiele liegt lokal im Browser und wird pro österreichischem Kalendertag getrennt geführt.
- Maximal 7 Tipps je Bereich und Suchlauf, Mindestwahrscheinlichkeit 60 %.
- Keine automatische Aktualisierung.
- Keine Gewinnzusage. Bitte verantwortungsvoll wetten.


VERSION 1.2.0 – TENNIS-SPIELPLAN-ERGÄNZUNG
- Neuer eigener Bereich „Tennis“, maximal 5 öffentliche Tipps pro Suchlauf.
- Datenquelle: TIPERO öffentliche API (kostenlos, ohne API-Key).
- Es werden nur Tipps für das aktuelle Datum (Europe/Vienna), mit mindestens 60 % ausgewiesenem Modellvertrauen und ohne Premium-Sperre angezeigt.
- Wettquoten werden nicht angezeigt oder als Filter verwendet.
- Die Tennisdaten werden unabhängig von den Fußball-Daten geladen. Ein Tennis-API-Fehler ändert die Fußballbereiche nicht.
- Die freie Datenquelle liefert möglicherweise keine Startzeit. In diesem Fall wird „Beginn nicht angegeben“ angezeigt; Spielbeginn und Spielstatus bitte vor Abgabe prüfen.
- Die Quelle veröffentlicht öffentliche und Premium-Tipps; der Scanner zeigt ausschließlich öffentliche Tipps.

VERSION 1.2.0 – TENNIS-DATENABGLEICH
- Neuer zusätzlicher Spielplanabruf über ESPN Scoreboard ATP und WTA (heutiges Datum, Europe/Vienna).
- Spielplan und TIPERO-Tippfeed sind voneinander getrennt. Dadurch bleibt der Spielplan sichtbar, auch wenn TIPERO keine öffentlichen Tipps liefert.
- Es werden keine eigenen Gewinnwahrscheinlichkeiten aus bloßen Spielplan-Daten erfunden. Ohne belastbares Modell erscheint ein Match nur als Spielplan-Eintrag, nicht als Wett-Tipp.
- ESPN-Abdeckung kann Challenger-/ITF-Turniere unvollständig enthalten; ein leerer ESPN-Spielplan beweist daher nicht, dass weltweit keine Tennisspiele stattfinden.
- Fußball 1X2 und X1/X2 bleiben unverändert.
