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


VERSION 1.2.1 – TENNIS-ABRUF KORRIGIERT
- TIPERO wird tagesgenau über /api/picks/YYYY-MM-DD abgefragt statt über den allgemeinen Latest-Endpunkt.
- ESPN-Tennis-Spielplan liest nun die tatsächliche Struktur events[].groupings[].competitions[] aus; direkte competitions bleiben als Fallback unterstützt.
- Spieler werden anhand der ESPN-Reihenfolge sortiert; Einzel-/Doppel-Erkennung und Statusfilter bleiben aktiv.
- Diagnose zeigt getrennt die Zahl der ESPN-Turniere und Matches in Gruppen sowie den TIPERO-Datentag.
- Service Worker hat eine neue Cache-Version und entfernt alte Surebet-App-Caches beim Aktivieren.
- Offizielle TIPERO-Dokumentation beschreibt den öffentlichen API-Zugriff als CORS-fähig und dokumentiert den tagesgenauen Endpoint.


VERSION 1.2.5 – DETAILLIERTE TENNIS-API-DIAGNOSE
- ESPN-Spielplan liest Gruppenspiele aus events[].groupings[].competitions[] und berücksichtigt die Einzel-/Doppel-Gruppenbezeichnung.
- TIPERO wird über den dokumentierten Tages-Endpunkt /api/picks/YYYY-MM-DD abgefragt.
- Diagnose protokolliert je ATP/WTA Turnier- und Matchzahlen, den TIPERO-Abfragetag, Antwortstatus und konkrete HTTP-/Netzwerkfehler.
- Fußballbereiche und Fußballfilter wurden nicht geändert.


VERSION 1.2.5 – DETAILLIERTE TENNIS-API-DIAGNOSE
- Protokolliert für TIPERO, ESPN ATP und ESPN WTA HTTP-Status, Antworttyp, Antwortgröße und Laufzeit.
- Zeigt eine kurze Antwortvorschau und JSON-/Netzwerkfehler an (einschließlich typischer CORS-/Browserblockaden).
- ATP und WTA werden unabhängig voneinander ausgewertet; ein Fehler bei einer Quelle verhindert die andere nicht.
- Zeigt TIPERO-Struktur, Pick-Anzahl und Filter-Zwischenergebnisse.
- Diagnosezeilen werden korrekt mit Zeilenumbrüchen dargestellt.
- Fußballlogik und Fußballfilter wurden nicht geändert.

UPDATE: Alle Dateien aus diesem Ordner gemeinsam in GitHub hochladen und bestehende Dateien ersetzen.


TENNIS-MODELL v1.2.5
- Eigenständige ATP-/WTA-Prognose auf Basis historischer Matchresultate.
- Elo-Bewertung, letzte 10 Matchresultate, Head-to-Head sofern vorhanden und Belag-Elo sofern im Datensatz verfügbar.
- Mindesthistorie: 8 Matches je Spieler; Mindestwahrscheinlichkeit: 60 %; maximal 5 Tipps.
- Historische Datensätze stammen aus Jeff Sackmanns Tennisdaten (ATP/WTA) und Mirrors.
- Lizenz: CC BY-NC-SA 4.0. Nur nicht-kommerzielle Nutzung; Attribution und ShareAlike beachten.
- Modellwahrscheinlichkeiten sind nicht kalibriert oder als Gewinnversprechen zu verstehen.
- Fußballbereich und Fußballfilter wurden nicht geändert.


DATENABDECKUNG v1.2.5
- Verifizierte Jeff-Sackmann-ATP- und WTA-Haupttour-Dateien 2023, 2024, 2025 und 2026.
- Die früher verwendeten inoffiziellen/unsicheren Mirror-URLs wurden entfernt.
- Spielerabgleich toleriert nun eindeutige Schreibweisen- und Namensvarianten; unsichere Zuordnungen werden nicht geraten.
- Diagnose zählt geladene Datensätze, erkannte Spieler, unzugeordnete Namen, unzureichende Historie und Spiele unter 60 %.
- Challenger/ITF wird ausdrücklich als nicht abgedeckt ausgewiesen, bis eine verlässliche separate Ergebnisquelle integriert ist. Es werden dafür keine falschen Prognosen erzeugt.
- Fußballbereich und Fußballfilter bleiben unverändert.


VERSION 1.2.6 – FUßBALLFILTER 1X2
- Der Mindestfilter für Fußball 1X2 ist ausdrücklich auf 60 % festgelegt.
- X1/X2 bleibt unverändert bei mindestens 60 %.
- Maximale Tippzahl (7 je Bereich), Datenquellen, positive EV-Prüfung soweit von der Quelle geliefert, Tagesfilter und Tennis bleiben unverändert.
- Hinweis: Im zugrunde liegenden v1.2.5-Quellpaket war der 1X2-Filter bereits auf 60 % eingestellt. Diese Version trennt die Filterwerte ausdrücklich, damit 1X2 künftig unabhängig angepasst werden kann.


VERSION 1.2.8 – 1X2-VERARBEITUNG UND DIAGNOSE
- Ausschließlich die 1X2-Auswertung wurde überarbeitet.
- Ein 1X2-Tipp wird nur angezeigt, wenn TipsAudit eine gültige Auswahl, mindestens 60 % faire Wahrscheinlichkeit und eine Soft-Quote oberhalb der daraus abgeleiteten fairen Quote liefert.
- Die Diagnose zählt nun getrennt: heutige offene Spiele, gültige Wahrscheinlichkeiten, Value-Blöcke, gültige Auswahlen, Unterschreitungen der 60-%-Schwelle, fehlende Quoten und fehlenden positiven EV.
- Es werden keine 1X2-Tipps künstlich aus der wahrscheinlichsten Auswahl erzeugt. Ohne bestätigtes Value-Signal bleibt der Bereich gegebenenfalls leer.
- X1/X2, Tennis, Spielplan, Datenquellen und übrige Einstellungen wurden nicht geändert.


Version 1.2.8: Der Fußballbereich 1X2 zeigt zusätzlich zur aktuellen Value-Auswahl auch die wahrscheinlichste 1X2-Auswahl aus den fairen TipsAudit-Wahrscheinlichkeiten, sofern sie mindestens 60 % erreicht. Diese ergänzenden Auswahlen haben nicht zwingend eine bestätigte spielbare Quote und sind ausdrücklich keine Value-Signale. Quote und Verfügbarkeit vor dem Einsatz beim Wettanbieter prüfen. X1/X2 und Tennis unverändert.


VERSION 1.3.0 – 1X2-SCHWELLE AUF 65 %
- Ausschließlich die Mindestwahrscheinlichkeit für Fußball 1X2 wurde von 55 % auf 65 % gesenkt.
- Die positive-EV-Prüfung für echte Value-Signale bleibt unverändert bestehen.
- Wenn kein Value-Signal vorliegt, kann weiterhin die stärkste faire 1X2-Wahrscheinlichkeit als statistische Auswahl erscheinen, sofern sie mindestens 65 % erreicht. Diese Auswahl hat nicht zwingend eine bestätigte Quote und ist kein nachgewiesener Value-Tipp.
- Maximal 7 Tipps je Suchlauf bleiben unverändert.
- Fußball X1/X2 bleibt bei mindestens 60 %; Tennis und alle übrigen Datenquellen, Filter und Funktionen bleiben unverändert.
- Die Diagnose weist für 1X2 nun ausdrücklich die 65-%-Schwelle aus.


VERSION 1.3.1 – TIPPSAUSWERTUNG UND ERGEBNISVERLAUF
- Neuer eigener Reiter „Auswertung“ mit Gesamtübersicht, Trefferquote und Gewinn/Verlust.
- Gespeicherte Tipps aus Fußball 1X2, Fußball X1/X2 und Tennis werden lokal im Browser gespeichert.
- Ergebnisstatus je Tipp: Offen, Gewonnen, Verloren oder Storniert.
- Gewinn/Verlust wird manuell als Nettobetrag in Euro eingetragen (Gewinn positiv, Verlust negativ).
- Statistik nach Bereich, CSV-Export und Funktion zum Löschen des lokalen Tippverlaufs.
- Speicherung erfolgt im lokalen Browser-Speicher des jeweiligen Geräts. Bei anderem Browser/Gerät oder gelöschten Browserdaten ist der Verlauf nicht automatisch verfügbar. CSV-Export zur Sicherung verwenden.
- Trefferquote zählt nur abgeschlossene Tipps (Gewonnen/Verloren); Storniert und Offen werden nicht berücksichtigt.
- Fußball- und Tennis-Tippquellen, Filter und Prognoselogik wurden nicht geändert.


VERSION 1.3.2 – MANUELLE TIPPAUSWAHL + SUPABASE
================================================

WICHTIG: Ein angezeigter Spielvorschlag wird NICHT automatisch in die Auswertung übernommen. Nur wenn du auf „Diesen Tipp übernehmen“ tippst, wird das Spiel in deiner persönlichen Auswertung gespeichert. Spielplan-Einträge ohne Tipp bleiben ausgeschlossen.

SUPABASE EINRICHTEN
1. Im Supabase-Dashboard deines Projekts den SQL Editor öffnen.
2. Den Inhalt von SUPABASE_SETUP.sql vollständig ausführen. Es wird eine eigene Tabelle „surebet_tips“ angelegt; bestehende Tabellen werden nicht gelöscht.
3. In Authentication die E-Mail-Anmeldung aktiviert lassen. Falls E-Mail-Bestätigung eingeschaltet ist, den Bestätigungslink aus der E-Mail anklicken.
4. Die App über HTTPS öffnen. In „Auswertung“ Project URL und den öffentlichen Publishable-/anon-Key eintragen und speichern.
5. Mit E-Mail und Passwort anmelden oder ein Konto erstellen.
6. Ab jetzt werden nur aktiv übernommene Tipps in Supabase gespeichert und zwischen Geräten mit demselben Konto synchronisiert.

SICHERHEIT
- Nur den öffentlichen Publishable-/anon-Key in der App verwenden. Niemals service_role- oder Secret-Keys eintragen.
- Die Tabelle verwendet Row Level Security. Jeder angemeldete Benutzer sieht und ändert nur seine eigenen Tipps.
- Das Passwort wird nicht in der App gespeichert; die Anmeldung wird von Supabase Auth verwaltet.
- Die URL und der öffentliche Key werden lokal im Browser gespeichert.

HINWEIS ZUR DATENMIGRATION
Die bisherige v1.3.2 hat angezeigte Tipps automatisch lokal vorgemerkt. Diese alten Einträge werden absichtlich NICHT in v1.3.2 übernommen, weil du ausdrücklich nur tatsächlich gespielte/übernommene Tipps auswerten möchtest.

FUSSBALL-BEREICH
Die Filter- und Prognoselogik für Fußball 1X2 und X1/X2 wurde in dieser Version nicht verändert.


VERSION 1.3.3 – SUPABASE-PROJEKT VORKONFIGURIERT
- Supabase Project URL und Publishable Key sind in der App vorkonfiguriert.
- Die Auswertung synchronisiert nur Tipps, die ausdrücklich über „Ich habe diesen Tipp gespielt“ übernommen wurden.
- Für die Cloud-Synchronisierung ist ein persönliches Konto in Supabase erforderlich.
- Vor dem ersten Login muss SUPABASE_SETUP.sql einmal im Supabase SQL Editor ausgeführt werden.
- Die Tabelle surebet_tips ist durch Row Level Security auf den jeweiligen angemeldeten Benutzer beschränkt.
- Fußball- und Tennisabruf sowie die bestehenden Tippfilter wurden in dieser Version nicht geändert.
