# Surebet Scanner 2.0 – Technischer Datenquellen-Test

Stand: 18.11.2026  
Branch: v2.0-development  
Wichtig: Dieser Bericht verändert weder Version 1.3.0 noch die veröffentlichte PWA.

## 1. Was bereits technisch geprüft werden konnte

### OpenLigaDB
- Die offizielle Swagger-Dokumentation ist erreichbar und beschreibt Endpunkte für verfügbare Ligen, Saisonen und Spieldaten.
- Die API dokumentiert 60 Anfragen pro Minute und empfiehlt sparsames Polling über den Änderungszeitpunkt.
- Die API-Dokumentation ist damit bestätigt. Ein Live-Abruf konkreter Liga-/Saisonantworten konnte über die hier verfügbare Web-Prüfumgebung nicht zuverlässig ausgeführt werden.
- Status: Dokumentation bestätigt; Live-Datenprobe noch offen.

### football-data.org
- Die offizielle Dokumentation bestätigt 10 Anfragen/Minute im Free-Plan.
- Ohne Registrierung sind nur Gebiet- und Wettbewerbslisten zugänglich; für Matchdaten ist ein registrierter API-Zugang erforderlich.
- Der Free-Plan umfasst laut Preisseite 12 Wettbewerbe und verzögerte Scores/Schedules.
- Status: Free-Plan und Zugriffsbeschränkungen bestätigt; Live-Probe benötigt persönlichen API-Token.

### ESPN ATP Scoreboard
- Der öffentliche ATP-Scoreboard-Endpunkt lieferte im Web-Prüfumfeld JSON mit ATP-Saisonmetadaten und Event-/Matchdaten.
- Der abgerufene ATP-Inhalt enthielt als Tagesdatum 2026-08-10, obwohl der Prüftag 2026-11-18 ist. Damit ist dieser konkrete Abruf deutlich veraltet und für eine aktuelle Tagesauswahl nicht verwendbar.
- Für WTA war der entsprechende Abruf in der Prüfumgebung nicht erfolgreich. Das ist kein Beweis für einen dauerhaften Ausfall, aber ein nicht bestandener Verfügbarkeitsnachweis.
- Es liegt weiterhin keine bestätigte offizielle API-Verfügbarkeits- oder Lizenzzusage für diese Endpunkte vor.
- Status: Technisch teilweise erreichbar, aber nicht als alleinige Produktionsquelle freigegeben.

### TIPERO und Skorbot
- Die jeweilige API-Dokumentation ist öffentlich auffindbar.
- Die Dokumentationen bestätigen die konkreten JSON-Endpunkte: Skorbot `/api/v1/matches.json`; TIPERO `https://api.tipero.app/api/latest` mit Root-Feldern `ok`, `run`, `picks` und `counts`.
- TIPERO dokumentiert CORS-Freigabe für Browser, schlüssellose öffentliche Lese-Endpunkte und empfohlenes Caching von 5–15 Minuten.
- Skorbot dokumentiert UTC-Zeitstempel, `updated_at` und Prognoseänderungen bis etwa eine Stunde vor Anpfiff.
- Direkte Live-JSON-Abrufe dieser beiden Endpunkte konnten über die Web-Prüfumgebung nicht zuverlässig bestätigt werden; deshalb ist die Laufzeitprüfung in einem echten Browser weiterhin offen.
- Status: Dokumentation bestätigt; Live-Probe in der tatsächlichen App-Umgebung erforderlich.

## 2. Konsequenz: kein falsches „API funktioniert“-Versprechen

Ein erfolgreicher Aufruf einer Dokumentationsseite beweist nicht, dass ein API-Endpunkt aus der veröffentlichten PWA zuverlässig erreichbar ist. Ebenso beweist ein einzelner JSON-Abruf nicht, dass die Daten vollständig, aktuell oder lizenzrechtlich für die geplante Nutzung freigegeben sind.

Vor Implementierung muss jede Quelle in einer kleinen Testumgebung geprüft werden:
- HTTP-Status und Antwortzeit
- CORS aus Browser und PWA
- JSON-Schema und Pflichtfelder
- Datenzeitpunkt und Zeitzone
- Anzahl verfügbarer Ligen/Matches
- Abdeckung der benötigten Saison
- Ausfälle, leere Antworten und Rate-Limits
- Lizenz und zulässige Speicherung/Weitergabe

## 3. Technische Architekturentscheidung

### Fußball
- OpenLigaDB zuerst als kostenlose Quelle für unterstützte Ligen testen.
- football-data.org nur als optionale Ergänzung, sobald ein persönlicher Free-API-Token eingerichtet ist.
- Keine automatische Abhängigkeit von TipsAudit.
- Skorbot höchstens als gekennzeichnete externe Vergleichsprognose.

### Tennis
- ESPN vorerst nur als austauschbaren Spielplan-Adapter behandeln, nicht als garantierte Kernquelle.
- Sackmann-Daten erst nach ausdrücklicher Lizenzentscheidung in das Modell integrieren.
- TIPERO nur als getrennte externe Benchmarkquelle.
- Challenger/ITF nicht stillschweigend als abgedeckt darstellen.

## 4. Isolierter Smoke-Test

Die Testseite liegt unter `v2-test/smoke-test.html` im Branch `v2.0-development`. Sie fragt fünf Endpunkte ab (OpenLigaDB, Skorbot, TIPERO, ESPN ATP und ESPN WTA), protokolliert HTTP-Status, Antwortzeit und JSON-Grundstruktur und berechnet ausdrücklich keine Tipps.

Wichtig: Die Datei wurde im Branch angelegt, aber noch nicht in einer echten Browser-/PWA-Laufzeit ausgeführt. Der GitHub-Datei-Viewer führt die HTML-Datei nicht als Testseite aus. Es gibt daher noch keine bestätigten Browser-Laufzeitwerte und keinen bestandenen CORS-Test.

Die bisherige externe Prüfung zeigt: OpenLigaDB und TIPERO haben dokumentierte öffentliche Endpunkte; Skorbot dokumentiert seinen aktuellen Matches-Endpunkt. Der konkrete ESPN-ATP-Abruf lieferte ein veraltetes Datum (2026-08-10); ESPN ist deshalb bis zu einem aktuellen Browser-Test nicht als Tagesquelle freigegeben. Der WTA-Abruf konnte hier nicht bestätigt werden.

Erst nach echtem Smoke-Test und Lizenzprüfung werden Datenadapter freigegeben. Erst danach beginnt die Modellierung und das Backtesting.

## 5. Quellen
- OpenLigaDB Swagger: https://api.openligadb.de/index.html
- football-data.org Pricing: https://www.football-data.org/pricing
- football-data.org API Policies: https://docs.football-data.org/general/v4/policies.html
- ESPN ATP Scoreboard: https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard
- TIPERO API Docs: https://tipero.app/api-docs
- Sackmann Archive und Lizenz: https://github.com/Aneeshers/tennis-sackmann-archive
