# Surebet Scanner 2.0 – Datenquellenprüfung (Stand: 18.11.2026)

## Ergebnis in Kürze

Für 2.0 werden Datenquellen in zwei getrennte Gruppen eingeteilt:
1. **Primärdaten** für Spielplan, Ergebnisse und historische Leistungsmerkmale.
2. **Externe Prognosen** als Vergleichs-/Benchmark-Signale, niemals als Ersatz für ein eigenes Modell.

Die in 1.3.0 verwendeten Drittanbieter dürfen nicht ungeprüft als tragende Datenbasis übernommen werden.

## Fußball

### OpenLigaDB – Kandidat für Spielpläne und Ergebnisse
- Öffentliche API ohne Registrierung und API-Schlüssel.
- Laut aktueller API-Dokumentation 60 Anfragen pro Minute; sparsame Abfrage empfohlen.
- Deckt Bundesliga und weitere verfügbare Ligen ab; tatsächliche Abdeckung muss je Wettbewerb geprüft werden.
- Datenlizenz: Open Database License (ODbL 1.0). Bei Weitergabe/Veröffentlichung von Datenbanken sind Attribution und Share-Alike-Pflichten zu prüfen.
- Eignet sich als kostenloser Fixture-/Result-Adapter für unterstützte Ligen, nicht automatisch als vollständige Statistikquelle für weltweite Ligen.
- Quelle: https://api.openligadb.de/index.html

### football-data.org – eingeschränkt kostenloser Kandidat
- Free-Plan: 12 Wettbewerbe, verzögerte Ergebnisse/Spielpläne, Tabellen; 10 Anfragen pro Minute.
- Für nicht authentifizierte Zugriffe sind nur Gebiet-/Wettbewerbslisten freigegeben; registrierter API-Zugang ist erforderlich.
- Gut als ergänzende strukturierte Quelle für die unterstützten Wettbewerbe, aber nicht ausreichend für den Anspruch „alle Ligen weltweit“ und nicht als Echtzeitquelle.
- Quelle: https://www.football-data.org/pricing und https://www.football-data.org/documentation/api

### Skorbot – nur externes Prognose-/Vergleichssignal
- Öffentliche, kostenlose, lesende JSON-API mit aktuellen Spielen und Wahrscheinlichkeiten; eigener User-Agent und Quellenangabe erwünscht.
- Der Betreiber weist darauf hin, dass Prognosen sich bis kurz vor Anpfiff ändern können und die finale Fassung etwa eine Stunde vor Spielbeginn vorliegt.
- Nutzungsbedingungen erlauben Zitieren/Verlinken einzelner Prognosen mit Quellenangabe; API kann geändert oder eingestellt werden.
- Nicht als unabhängige Rohdatenbasis oder als eigenes Modell behandeln.
- Quelle: https://skorbot.live/en/api/ und https://skorbot.live/en/terms/

### TipsAudit – nicht als frei scrape-bare Primärquelle einplanen
- Die Website veröffentlicht Fair Odds/Value-Analysen und beschreibt öffentliche Datensätze.
- Die AGB erlauben persönliche, nicht-kommerzielle Ansicht/Teilung mit Quellenangabe, untersagen aber Scraping, Kopieren oder kommerzielle Verwertung ohne schriftliche Genehmigung.
- Daher keine automatisierte API-/Scraping-Abhängigkeit für 2.0 einbauen, solange keine ausdrückliche Erlaubnis bzw. dokumentierte API-Lizenz vorliegt.
- Quelle: https://tipsaudit.com/de/terms und https://tipsaudit.com/about

## Tennis

### Jeff Sackmann ATP/WTA – wertvolle historische Daten, aber Lizenzschranke
- ATP-/WTA-Matchdaten und Ranglisten sind in öffentlichen Archiven bis 2026 auffindbar.
- Lizenz: CC BY-NC-SA 4.0. Erfordert Namensnennung und Weitergabe abgeleiteter Daten/Arbeiten unter gleicher Lizenz; nicht-kommerzielle Nutzung בלבד.
- Für ein privates, nicht-kommerzielles Forschungs-/Testmodell eventuell geeignet, aber vor einer Veröffentlichung oder kommerziellen Nutzung rechtlich gesondert zu prüfen.
- Aktuelle Archivübersicht: https://github.com/Aneeshers/tennis-sackmann-archive
- Lizenz: https://github.com/Aneeshers/tennis-sackmann-archive/blob/main/LICENSE

### TIPERO – externer Prognosevergleich, nicht eigenes Modell
- Öffentliche Read-only-JSON-Endpunkte ohne API-Schlüssel; laut Dokumentation für angemessene Nutzung kostenlos, mit CORS und empfohlenem Cache von 5–15 Minuten.
- Die öffentliche API enthält öffentliche Picks; Premium-Daten sind gesperrt/authentifiziert.
- Die API-Dokumentation nennt auch kommerzielle Integrationen als möglich; sichtbare Attribution beim Widget ist zu beachten.
- Als Benchmark/externes Signal möglich, nicht als Ersatz für unabhängige eigene Wahrscheinlichkeiten.
- Quelle: https://tipero.app/api-docs

### ESPN Scoreboard – nur provisorischer Fixture-Adapter
- Die 1.3.0-App verwendet ESPN-Scoreboard-Endpunkte für ATP/WTA-Spielpläne.
- In dieser Recherche wurde keine belastbare offizielle Entwickler-API-Lizenz oder stabile öffentliche API-Zusage für diese konkreten Endpunkte bestätigt.
- Daher in 2.0 nicht als alleinige kritische Quelle fest einplanen, bis Nutzungsbedingungen, Stabilität und Verfügbarkeit geprüft sind.

## Konsequenzen für 2.0

1. Fußball: OpenLigaDB und football-data.org als mögliche Fixture-/Result-Adapter mit Liga-Abdeckung je Wettbewerb; kein Versprechen weltweiter Vollständigkeit.
2. Tennis: Sackmann-Daten nur nach dokumentierter Lizenzentscheidung; Datenstände lokal versionieren und Zeitstempel festhalten. Für spätere kommerzielle Nutzung andere lizenzierte Datenquelle nötig.
3. TIPERO und Skorbot nur als externe Benchmarks mit Quellenlabel, niemals als eigene Modellberechnung ausgeben.
4. TipsAudit nicht automatisiert abfragen/scrapen, solange keine ausdrückliche schriftliche Erlaubnis vorliegt.
5. Keine Quelle allein vertrauen: Spiel-ID/Teams/Startzeit/Status nach Möglichkeit gegen zweite Quelle plausibilisieren.
6. Vor jedem Modelltest historische Daten strikt nach Zeit sortieren; keine Informationen verwenden, die zum damaligen Prognosezeitpunkt noch nicht verfügbar waren.

## Offene Prüfungen vor Implementierung

- Konkrete Ligaabdeckung und aktuelle Saisondaten von OpenLigaDB und football-data.org maschinell abfragen.
- ESPN-Endpunkte und Nutzungsbedingungen weiter verifizieren oder durch verlässlich dokumentierte Fixture-Quelle ersetzen.
- Für Tennis Lizenzentscheidung festhalten; Sackmann-Daten nicht in eine öffentliche/kommerzielle Version übernehmen, bevor dies geklärt ist.
- API-Verfügbarkeit, Antwortschema, Aktualisierungszeitpunkte und Rate-Limits in automatisierten Smoke-Tests prüfen.
- Erst nach diesen Prüfungen Adapter implementieren.

## Wichtiger methodischer Hinweis

Die in 1.3.0 vorhandenen Datenlieferanten liefern teils bereits fertige Prognosen. Diese Treffer dürfen nicht als Beleg für die Qualität eines neuen eigenen Modells verwendet werden. 2.0 muss eigene Modellwahrscheinlichkeiten unabhängig berechnen und anhand historischer, zeitlich sauberer Tests bewerten.
