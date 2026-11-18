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
- Lizenz: CC BY-NC-SA 4.0. Erfordert Namensnennung und Weitergabe abgeleiteter Daten/Arbeiten unter gleicher Lizenz; nicht-kommerzielle Nutzung.
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


## Ergänzende OpenLigaDB-Abdeckungsprüfung (18.11.2026)

### Nachweisbare Saisonabdeckung 2026/27

Ein unabhängiger technischer Prüfbericht vom 30.10.2026 dokumentiert erfolgreiche, schlüssellose API-Abrufe für:
- Premier League: 380 Spiele in der Saison 2026/27; der Bericht nennt zugleich noch nicht nachgetragene Resultate an Spieltagen.
- LaLiga: 380 Spiele.
- Deutsche Bundesliga: 306 Spiele.

Diese drei Wettbewerbe sind damit als **nachgewiesene API-Kandidaten** eingestuft, nicht als automatisch produktionsfreigegeben. Die dokumentierten Verzögerungen bei Ergebniseinträgen zeigen, dass Community-Pflege und Aktualität laufend überwacht werden müssen.

Quelle des technischen Drittanbieter-Prüfberichts (Abrufdatum 30.10.2026): https://footballapis.com/p/openligadb/

Die offizielle OpenLigaDB-API dokumentiert die Endpunkte `/getavailableleagues/{season}` und `/getmatchdata/{leagueShortcut}/{leagueSeason}`. Sie bestätigt die API-Funktion, aber nicht die Vollständigkeit jeder einzelnen Liga: https://api.openligadb.de/index.html

### Status der zehn Zielwettbewerbe

| Zielwettbewerb | OpenLigaDB-Status für 2026/27 |
|---|---|
| England – Premier League | Nachgewiesener API-Kandidat; Resultatverzögerungen beachten |
| Spanien – LaLiga | Nachgewiesener API-Kandidat |
| Deutschland – Bundesliga | Nachgewiesener API-Kandidat |
| Italien – Serie A | Nicht ausreichend nachgewiesen |
| Frankreich – Ligue 1 | Nicht ausreichend nachgewiesen |
| Niederlande – Eredivisie | Nicht ausreichend nachgewiesen |
| Portugal – Primeira Liga | Nicht ausreichend nachgewiesen |
| Österreich – Bundesliga | Nicht ausreichend nachgewiesen |
| Belgien – Pro League | Nicht ausreichend nachgewiesen |
| Schweiz – Super League | Nicht ausreichend nachgewiesen |

„Nicht ausreichend nachgewiesen“ bedeutet nicht, dass keine Daten existieren. Es bedeutet, dass für diese konkrete Saison keine belastbare, wiederholbare und vollständig geprüfte Abdeckung vorliegt. Es werden daher keine League-Shortcuts geraten und keine dieser Ligen automatisch aktiviert.

### Freigabekriterien je Wettbewerb

Ein Wettbewerb wird erst freigegeben, wenn wiederholte technische Abrufe Folgendes bestätigen:
1. Eindeutige Liga-ID/League-Shortcut und Saison.
2. Plausible Anzahl von Spielen und Teams für das Format der Liga.
3. Vollständige Match-ID, Heim-/Auswärtsteam, Startzeit mit Zeitzonenbezug und Status.
4. Aktualisierungszeitpunkt und erkennbare Ergebnisaktualität.
5. Wiederholbarkeit der Abrufe sowie Einhaltung der API-Limits.
6. Lizenz-/Attributionsanforderungen dokumentiert.

Die drei nachgewiesenen Kandidaten erhalten ebenfalls erst nach einem echten Laufzeittest und einer Aktualitätskontrolle eine technische Produktionsfreigabe.


## Ergänzende Tennisquellenprüfung (18.11.2026)

### TennisMyLife / TML-Database – aktueller ATP-Datenkandidat, aber mit Nutzungsbeschränkung

- Die öffentliche TML-Database dokumentiert aktuelle ATP-Matchdaten und historische Ergebnisse; das GitHub-Repository weist darauf hin, dass die laufend aktualisierte Datenbank inzwischen auf die Website stats.tennismylife.org verlagert wurde.
- Ein öffentliches 2026-CSV ist auffindbar und enthält unter anderem Turnier, Belag, Sieger-/Verlierer-IDs, Namen, Matchdatum, Runde und Matchstatistiken.
- Die aktuellen öffentlichen Nutzungsbedingungen beschränken die Datensätze auf persönliche, Bildungs- und nicht-kommerzielle Forschungszwecke. Weiterverteilung oder Weiterverkauf der Rohdaten ist nicht gestattet. Kommerzielle Nutzung, einschließlich Training/Validierung statistischer Prognosemodelle für kommerzielle Dienste oder Monetarisierung von Modellprognosen, benötigt vorherige ausdrückliche schriftliche Genehmigung.
- Der öffentliche Hinweis sagt ausdrücklich, dass ein freier Download keine kommerziellen Nutzungsrechte verleiht.
- Daher ist TML **kein uneingeschränkt freigegebener Datenlieferant** für eine öffentlich oder kommerziell genutzte Scanner-Version. Eine private, nicht-kommerzielle Verwendung wäre gesondert anhand der aktuellen Bedingungen zu beurteilen.
- Wichtige Quellen: https://tennismylife.github.io/TML-Database/ ; https://github.com/Tennismylife/TML-Database ; https://github.com/Tennismylife/TML-Database/blob/master/2026.csv

### Kostenlose Tennis-APIs – Einschränkung

- Eine aktuelle technische Marktübersicht vom 02.11.2026 kommt zu dem Ergebnis, dass ATP und WTA keine öffentlich dokumentierte, frei nutzbare offizielle Entwickler-API anbieten.
- In der Übersicht werden ESPN- und theScore-Endpunkte als technisch erreichbare, schlüssellose Datenquellen genannt. Das ist jedoch keine Lizenzfreigabe und keine Zusage stabiler Verfügbarkeit. Bei WTA-Daten wird automatisierter Zugriff auf die offizielle Website ausdrücklich als durch Nutzungsbedingungen eingeschränkt beschrieben.
- Eine erreichbare URL oder ein öffentliches JSON-Endpoint ist keine ausreichende Erlaubnis für automatisierte Nutzung oder Weiterveröffentlichung.
- Quelle: https://sportsapis.dev/tennis-api

### LiveTennisAPI – transparenter, aber begrenzter Free-Tarif

- Die öffentliche Dokumentation beschreibt einen Free-Tarif mit API-Key für aktuelle und kommende Spiele, Live-Spielstände, Spieler, Fixtures und Turnierkatalog.
- Historische Ergebnislisten sind grundsätzlich einem höheren Tarif vorbehalten; der Free-Tarif bietet nur einen begrenzten monatlichen historischen Testzugriff. Damit reicht er nicht für einen belastbaren, tourweiten Elo-Backtest aus.
- Das kann ein möglicher Fixture-/Live-Status-Kandidat sein, ist aber keine vollständige kostenlose Datenbasis für historische Modellvalidierung.
- Quelle: https://github.com/livetennisapi

### Tennis.esp.br – nützlicher Transparenz-/Benchmark-Kandidat, kein ungeprüfter Feed

- Die Website dokumentiert eine Kombination aus Sackmann/Tennis Abstract (CC BY-NC-SA 4.0) für historische Daten, TennisMyLife für aktuelle ATP/WTA-Saisonmatches und offiziellen WTA-Rankings.
- Die Datenherkunft und der letzte Import werden transparent ausgewiesen. Die Seite selbst ist jedoch kein Nachweis einer frei nutzbaren API für den Scanner.
- Quelle: https://tennis.esp.br/en/data

### Konsequenz für die Tennisintegration

1. Die vorhandene Elo-Baseline bleibt eine reine Rechenkomponente; sie wird nicht mit ungeprüften Spielplan- oder Ergebnisdaten gespeist.
2. Für private, nicht-kommerzielle Entwicklung kann eine Nutzung von Sackmann-/TML-Daten geprüft werden, aber nur mit korrekter Attribution und unter Einhaltung der jeweiligen NC-/ShareAlike- bzw. TML-Bedingungen.
3. Für eine öffentlich erreichbare oder später kommerzielle Anwendung wird vor Integration eine Datenquelle mit ausdrücklich passenden Nutzungsrechten benötigt.
4. ESPN/theScore-Endpunkte werden nicht als Produktionsquelle fest verdrahtet, solange Rechte, Schema und Verfügbarkeit nicht ausreichend dokumentiert sind.
5. Die Tennisoberfläche wird erst freigegeben, wenn ATP und WTA getrennt mit aktuellen Fixtures, eindeutigen Spieler-IDs, Startzeit/Status und ausreichend zeitlich korrekter Matchhistorie versorgt werden können.


## Ergänzende CC0-Fußball-Historienquelle (18.11.2026)

### OpenFootball – für unabhängige historische Modelltests geeignet
- OpenFootball veröffentlicht historische Spielpläne und Ergebnisse im Football.TXT-Format für zahlreiche nationale Ligen.
- Die Projekt-Repositories weisen CC0-1.0/Public-Domain für Daten, Schema und Skripte aus.
- Nachweisbare aktuelle Dateien (Stand der Repository-Prüfung 18.11.2026) bestehen unter anderem für England, Spanien, Deutschland, Italien, Österreich, Belgien, Frankreich, Niederlande und Portugal. Für die Schweiz ist die neueste auffindbare Datei in der geprüften Verzeichnisliste 2024/25; aktuelle Abdeckung ist daher nicht pauschal anzunehmen.
- Die Daten sind für historische Tests geeignet, aber nicht als Live-Quelle. Einige Dateien haben Datum und lokale Anstoßzeit ohne explizite Zeitzone; für Backtests wird daher konservativ verhindert, dass Spiele desselben Kalendertags gegenseitig als Historie dienen.
- Teamnamen können zwischen Saisonen variieren. Der Testadapter normalisiert Namen, ersetzt aber keine sorgfältig gepflegte Team-Alias-/Identitätszuordnung. Dadurch können einzelne Teamhistorien künstlich auseinanderfallen.
- Quellen: https://github.com/openfootball/leagues ; https://github.com/openfootball/europe ; https://github.com/openfootball/england ; https://github.com/openfootball/espana ; https://github.com/openfootball/deutschland ; https://github.com/openfootball/italy ; https://github.com/openfootball/austria ; https://github.com/openfootball/belgium

### Nutzung im Scanner
- OpenFootball wird zunächst ausschließlich für reproduzierbare historische Modelltests verwendet.
- Es wird nicht als zweite Live-Quelle in der App angezeigt und nicht mit OpenLigaDB-Daten vermischt.
- Backtest-Berichte müssen je Liga/Saison die tatsächlich geladenen und geparsten Spiele ausweisen. Fehlende Dateien werden als nicht verfügbar dokumentiert und nicht durch erfundene Werte ersetzt.
- Trefferquote allein ist kein Qualitätsnachweis; Brier Score und Log Loss werden ebenfalls berichtet. Die Kennzahlen werden nur für ausreichend große, zeitlich valide Stichproben interpretiert.

### TennisData.App – nicht automatisiert übernehmen
- Die Download-Seite bewirbt kostenlose ATP-/WTA-CSV-Dateien für 2021–2026 und sagt, die Dateien könnten „in any way“ genutzt werden.
- Die am 16.04.2026 aktualisierten Nutzungsbedingungen untersagen jedoch Scraping, systematische Extraktion und die Nutzung der Inhalte zum Aufbau/Unterstützen eines konkurrierenden Produkts oder Datensatzes. Zudem sind die Inhalte auf persönliche, nicht-kommerzielle Nutzung beschränkt und dürfen ohne schriftliche Genehmigung nicht weiterveröffentlicht oder abgeleitet werden.
- Wegen dieses Widerspruchs zwischen Download-Werbung und Terms wird TennisData.App nicht automatisiert in den Scanner integriert, solange keine ausdrückliche schriftliche Klärung vorliegt.
- Quellen: https://tennisdata.app/downloads/ ; https://tennisdata.app/terms/
