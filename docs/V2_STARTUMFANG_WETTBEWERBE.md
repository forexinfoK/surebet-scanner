# Surebet Scanner 2.0 – Startumfang der Wettbewerbe

Stand: 18.11.2026  
Branch: v2.0-development  
Status: festgelegter Entwicklungsumfang für die erste Ausbaustufe; tatsächliche Datenabdeckung ist je Quelle noch technisch zu verifizieren.

## 1. Fußball – Startligen

Die erste Ausbaustufe konzentriert sich auf zehn europäische nationale Topligen:

1. England – Premier League
2. Spanien – LaLiga
3. Deutschland – Bundesliga
4. Italien – Serie A
5. Frankreich – Ligue 1
6. Niederlande – Eredivisie
7. Portugal – Primeira Liga
8. Österreich – Bundesliga
9. Belgien – Belgian Pro League
10. Schweiz – Super League

Zusätzlich können nationale Pokalbewerbe oder internationale Klubwettbewerbe später ergänzt werden. Sie gehören nicht automatisch zum Startumfang.

**Wichtige Einschränkung:** Diese Liste beschreibt den gewünschten Produktumfang, nicht die bereits bestätigte Abdeckung der kostenlosen Datenquellen. Eine Liga wird erst aktiviert, wenn Spielplan, Resultate, Teamzuordnung, Saison und Aktualität im technischen Test ausreichend bestätigt wurden. Nicht abgedeckte Ligen werden in der Anwendung nicht stillschweigend als verfügbar angezeigt.

## 2. Tennis – Startumfang

- ATP-Haupttour
- WTA-Haupttour

Challenger, ITF, Qualifikationsturniere und Juniorenbewerbe bleiben vorerst außerhalb des aktiven Prognoseumfangs. Eine spätere Aufnahme erfordert nachgewiesene Datenqualität und ausreichende historische Daten.

## 3. Gemeinsame Regeln

- Anzeige nach österreichischer Lokalzeit (Europe/Vienna); Speicherung und Quellenabgleich mit eindeutigen UTC-Zeitstempeln.
- Nur zukünftige, eindeutig identifizierte und nicht begonnene Matches erhalten eine Prognose.
- Tagesansicht bezieht sich auf den aktuellen Kalendertag in Österreich.
- Verschobene, abgesagte, laufende oder beendete Spiele werden ausgeschlossen.
- Die Abdeckung wird pro Wettbewerb sichtbar gemacht; fehlende Daten werden nicht durch Schätzungen oder fremde Prognosen ersetzt.

## 4. Freigabekriterien je Wettbewerb

Ein Wettbewerb wird erst aktiviert, wenn mindestens folgende Prüfungen bestanden sind:
- eindeutige Liga-/Tour- und Saisonkennung;
- verlässliche Begegnungen und Teilnehmer;
- korrekte Startzeit und Matchstatus;
- ausreichende historische Ergebnisse für die Baseline;
- keine ungeklärten Lizenz- oder Nutzungsbeschränkungen;
- wiederholte technische Abrufe ohne systematische Schema- oder CORS-Fehler.

## 5. Nächste technische Reihenfolge

1. Öffentliche Fixture-/Result-Endpunkte für die zehn Fußballligen und ATP/WTA verifizieren.
2. Datenadapter und normalisiertes Matchformat implementieren.
3. Historische Datensätze und Lizenzstatus festlegen.
4. Fußball-Torerwartungsbaseline und Tennis-Elo-Baseline implementieren.
5. Walk-forward-Backtests und Kalibrierung.
6. Erst danach Vorschläge in einer separaten V2-Testoberfläche anzeigen.

## 6. Schutz der stabilen Version

Alle Arbeiten bleiben ausschließlich im Branch `v2.0-development`. `main`, die veröffentlichte PWA und Version 1.3.0 werden nicht verändert. Kein Merge und keine Veröffentlichung ohne ausdrückliche Freigabe.
