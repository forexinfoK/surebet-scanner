# Surebet Scanner 2.0 – Fachkonzept der Prognosemodelle

Stand: 18.11.2026  
Branch: v2.0-development  
Geltungsbereich: fachliche Spezifikation, noch keine produktive Modellimplementierung.

## 1. Grundprinzipien

- Das Modell berechnet Wahrscheinlichkeiten unabhängig von Wettquoten.
- Quoten dürfen später separat zur Berechnung eines Value-Signals verwendet werden; sie dürfen die Modellwahrscheinlichkeit nicht nachträglich verändern.
- Jede Prognose erhält einen eindeutigen Prognosezeitpunkt, Datenstand, Modellversion und eine Datenqualitätsbewertung.
- Es werden keine Tipps erzwungen. Wenn Daten fehlen, veraltet oder widersprüchlich sind, wird das Spiel ausgeschlossen oder als nicht bewertbar markiert.
- Prognosen dürfen ausschließlich Informationen verwenden, die zum jeweiligen Prognosezeitpunkt verfügbar waren.
- Fußball und Tennis werden getrennt modelliert und getrennt kalibriert.

## 2. Fußballmodell

### 2.1 Zielmärkte

Primärer Modelloutput ist ein konsistenter Wahrscheinlichkeitsvektor:
- Heimsieg (1)
- Unentschieden (X)
- Auswärtssieg (2)

Die Wahrscheinlichkeiten müssen zusammen 100 % ergeben.

Doppelte Chance wird daraus transparent abgeleitet:
- 1X = P(1) + P(X)
- X2 = P(X) + P(2)
- 12 = P(1) + P(2)

Doppelte Chance ist damit kein unabhängiges Modell. Die App muss dies in der Detailansicht kenntlich machen.

### 2.2 Eingangsmerkmale

Nur Merkmale verwenden, die vor dem Spiel verfügbar und für die jeweilige Liga ausreichend vollständig sind:
- Heim- und Auswärtsstärke
- erzielte und erhaltene Tore, getrennt nach Heim/Auswärts
- Gegnerstärke und Stärke des bisherigen Spielplans
- jüngste Form, mit zeitlicher Gewichtung und ausreichender Stichprobe
- Saison-/Wettbewerbsniveau
- optional: verfügbare Aufstellungs-/Ausfallinformationen, aber nur mit verlässlichem Zeitstempel und Quellenbeleg

Tabellenplatz oder letzte Ergebnisse dürfen nicht isoliert als Qualitätsmaß verwendet werden. Kleine Stichproben müssen geglättet werden.

### 2.3 Modellansatz für den Start

Als robuste Baseline wird ein Torerwartungsmodell festgelegt:
1. Heim- und Auswärtstor-Erwartungswerte aus Team-Offensiv-/Defensivstärke und Ligadurchschnitt schätzen.
2. Daraus eine Torverteilung und die resultierenden 1X2-Wahrscheinlichkeiten berechnen.
3. Modellparameter pro Wettbewerb/Saison schätzen oder bei zu wenig Daten auf übergeordnete Ligawerte zurückgreifen.
4. Abhängigkeiten und Sonderfälle (z. B. niedrige Torzahlen) anhand der Backtests prüfen.

Ein Poisson-basiertes Modell ist die Startbaseline, nicht automatisch die endgültige Modellwahl. Erweiterungen wie Dixon-Coles oder ein separates Machine-Learning-Modell dürfen erst nach messbarem Out-of-sample-Vorteil übernommen werden.

### 2.4 Ausschlussregeln

Ein Spiel wird nicht prognostiziert, wenn:
- Paarung, Wettbewerb oder Startzeit nicht eindeutig normalisiert sind;
- Spielstatus bereits begonnen, verschoben, abgesagt oder beendet ist;
- zentrale Leistungsdaten fehlen oder veraltet sind;
- zu wenige historische Daten für eine belastbare Schätzung vorliegen;
- Quellen widersprüchliche Teams oder Anstoßzeiten melden und der Konflikt nicht geklärt werden kann.

## 3. Tennismodell

### 3.1 Getrennte Bereiche

ATP und WTA werden getrennt ausgewertet. Challenger- und ITF-Turniere werden nur aufgenommen, wenn Datenabdeckung, Spielerzuordnung und historische Tiefe nachweislich ausreichen. Eine fehlende Abdeckung darf nicht als vollständige Tour-Abdeckung dargestellt werden.

### 3.2 Eingangsmerkmale

Mögliche Merkmale – nur bei ausreichender Datenqualität:
- Elo-Gesamtbewertung
- Elo nach Belag (Hartplatz, Sand, Rasen, Teppich sofern Daten vorhanden)
- jüngste Matchleistung mit zeitlicher Gewichtung
- Serve-/Return-Kennzahlen, wenn Definition und Datenabdeckung konsistent sind
- Qualität der Gegner in der jüngsten Formphase
- Belastung/Spielhäufigkeit, wenn Matchzeiten zuverlässig verfügbar sind
- Head-to-Head nur als schwaches Zusatzmerkmal und nur bei ausreichender Aussagekraft

Rankingposition allein ist kein hinreichendes Prognosemodell. H2H darf wegen kleiner Stichproben nicht übergewichtet werden.

### 3.3 Modellansatz für den Start

- Baseline: Elo-Differenzmodell, zunächst getrennt nach ATP/WTA.
- Belagspezifisches Elo wird mit Gesamt-Elo kombiniert; Gewichtung wird ausschließlich anhand zeitlich getrennter Validierungsdaten bestimmt.
- Serve-/Return-Merkmale und Form werden erst ergänzt, wenn sie vollständig, zeitlich korrekt und über Wettbewerbe hinweg vergleichbar sind.
- Wahrscheinlichkeiten werden anschließend auf einem separaten Validierungszeitraum kalibriert.
- Keine Daten aus dem späteren Matchverlauf oder nach dem Prognosezeitpunkt dürfen in Features einfließen.

### 3.4 Ausschlussregeln

Ein Match wird nicht prognostiziert, wenn:
- Spieleridentität nicht eindeutig ist;
- Match abgesagt, beendet oder bereits begonnen hat;
- Belag oder Turnierkontext unklar ist, sofern das Modell diesen benötigt;
- historische Daten für einen Spieler unzureichend oder nicht aktuell sind;
- Datenquellen widersprüchliche Matchzeiten oder Teilnehmer melden.

## 4. Datenqualität und Prognosefreigabe

Jedes Match erhält einen Qualitätsstatus:
- **A – ausreichend:** Identität, Startzeit, Status und erforderliche Modellmerkmale vollständig und aktuell.
- **B – eingeschränkt:** kleinere Lücken; Prognose nur, wenn die Baseline diese Lücken ausdrücklich toleriert und die Einschränkung sichtbar ist.
- **C – unzureichend:** wesentliche Daten fehlen/widersprechen sich; keine Prognose.

Qualitätsstatus und Modellwahrscheinlichkeit sind getrennte Größen. Eine hohe Modellwahrscheinlichkeit darf schlechte Datenqualität nicht überdecken.

## 5. Kalibrierung und Backtesting

### 5.1 Testverfahren
- Chronologisches Walk-forward-Verfahren: Training nur mit Daten vor dem Testzeitraum.
- Keine zufällige Aufteilung, die spätere Spiele in Trainingsdaten vor früheren Spielen einbringt.
- Prognosezeitpunkt muss simuliert werden; nur bis dahin verfügbare Daten sind zulässig.
- Ergebnisse nach Sport, Wettbewerb, Markt, Saison und Qualitätsstatus ausweisen.

### 5.2 Kennzahlen
- Brier Score
- Log Loss
- Kalibrierung nach Wahrscheinlichkeitsklassen
- Trefferquote mit Anzahl der ausgewerteten Spiele
- Abdeckung: Anteil aller grundsätzlich verfügbaren Spiele, für die das Modell eine Prognose abgeben konnte

Trefferquote allein ist kein ausreichendes Qualitätsmaß. ROI oder Profitabilität wird nur ausgewiesen, wenn reale, zeitgestempelte Quoten und eine klar definierte Einsatzstrategie vorhanden sind.

### 5.3 Mindestanforderung vor Freigabe
- Baseline gegen eine einfache Referenz (z. B. Ligadurchschnitt bzw. neutrales Elo) vergleichen.
- Ergebnisse auf einem unangetasteten Testzeitraum prüfen.
- Konfidenzintervalle bzw. Stichprobengrößen offen ausweisen.
- Keine Modellverbesserung behaupten, wenn sie nicht auf Out-of-sample-Daten messbar ist.
- Mindeststichprobe und Freigabeschwellen werden vor Auswertung festgelegt, nicht nachträglich passend gemacht.

## 6. Darstellung in der Anwendung

Jeder Tipp/Prognoseeintrag soll mindestens anzeigen:
- Sport, Wettbewerb, Begegnung und lokale Startzeit
- Markt und Modellwahrscheinlichkeit
- Qualitätsstatus A/B/C
- Modellversion und Prognosezeitpunkt
- kurze Begründung anhand der wichtigsten verfügbaren Faktoren
- Datenquellen und Aktualitätszeitpunkt

Quoten, falls später vorhanden, werden separat angezeigt:
- angebotene Quote und Zeitpunkt der Quotenabfrage
- daraus berechnete Break-even-Wahrscheinlichkeit
- Value-Abstand / EV, klar getrennt von der Modellwahrscheinlichkeit

## 7. Offene Entscheidungen vor Implementierung

1. Welche Fußballligen sollen zuerst verbindlich unterstützt werden? Die verfügbaren kostenlosen Quellen decken nicht automatisch alle weltweiten Ligen ab.
2. Soll die erste Tennisversion ausschließlich ATP/WTA-Haupttour umfassen, bis Challenger/ITF-Daten nachgewiesen sind?
3. Welcher historische Datenbestand darf rechtlich für private Tests und später für eine Veröffentlichung genutzt werden?
4. Welche Mindeststichprobe und welche vorab festgelegten Freigabeschwellen sollen für Backtests gelten?

## 8. Entwicklungsstatus

- [x] Fachliche Baseline für Fußball und Tennis beschrieben
- [x] Trennung Modellwahrscheinlichkeit / Quoten / Value festgelegt
- [x] Datenqualitäts- und Ausschlussprinzipien beschrieben
- [ ] Datenquellen technisch im Browser verifiziert
- [ ] Ligen-/Tourumfang verbindlich festgelegt
- [ ] Lizenzentscheidung dokumentiert
- [x] Erste isolierte Poisson-Baseline implementiert (Modul 0.1.0; noch ohne gelernte Ligaparameter und ohne reale Matchdaten)
- [ ] Walk-forward-Backtest durchgeführt
- [ ] Paralleltest gegen Version 1.3.0 abgeschlossen
- [ ] Nutzerfreigabe vor Veröffentlichung


## 9. Implementierungsstand – Fußball-Poisson-Baseline (18.11.2026)

Implementiert in `v2/src/models/football-poisson.js`:
- Erwartete Heim- und Auswärtstore aus Ligator-Durchschnitt sowie Heim-/Auswärts-Offensiv- und Defensivfaktoren.
- Unabhängige Poisson-Torverteilungen mit numerischer Restmassen-Behandlung.
- Ableitung von 1X2 und daraus 1X, X2 und 12.
- Modellfunktion benötigt keine Wettquoten und gibt explizit `odds_used: false` zurück.
- Ungültige oder nicht positive Eingabeparameter werden abgewiesen.

Isolierte Funktionstests: 8/8 bestanden (Wahrscheinlichkeitssumme, alle drei Doppelte-Chance-Ableitungen, Heimvorteil-Sensitivität, Quotenunabhängigkeit, ungültige Eingaben).

Testseite: `v2-test/football-poisson-test.html` (synthetische Werte, keine realen Spiele).

**Wichtige Grenze:** Das ist die mathematische Modell-Baseline, noch kein trainiertes oder validiertes Prognosemodell. Es fehlen echte, lizenzkonforme historische Ergebnisdaten, zeitlich korrekte Teamstärken pro Liga/Saison, Walk-forward-Backtest und Kalibrierung. Die Beispielwahrscheinlichkeiten aus dem Test sind keine Prognosen und dürfen nicht als Tipps angezeigt werden.


## 10. Implementierungsstand – Teamstärken-Schätzung (18.11.2026)

Implementiert in `v2/src/models/football-team-strength.js`:
- gewichtete Ligator-Durchschnitte mit exponentieller Halbwertszeit (Standard 180 Tage);
- getrennte Heim-/Auswärts-Offensiv- und Defensivwerte;
- Glättung über einen Liga-Durchschnitts-Prior (Standardgewicht fünf Spiele);
- ausschließlich abgeschlossene Spiele mit Startzeit strikt vor dem Zielanpfiff;
- fehlende Teamhistorie, ungültige Daten und Zeitangaben ohne Zeitzone führen zum Abbruch.

Isolierte Funktionstests: 8/8 bestanden, einschließlich Prüfung auf Zukunftsdaten-Leakage. Testseite: `v2-test/football-team-strength-test.html`.

**Grenze:** Die Tests verwenden synthetische Fixtures. Die Schätzung ist noch nicht mit realen Ligadaten validiert. Sie setzt außerdem voraus, dass die übergebenen historischen Spiele derselben Wettbewerb-/Saisonpopulation angehören und Team-IDs stabil zugeordnet sind. Der Parameter `priorMatches` ist eine technische Glättungseinstellung, noch nicht anhand eines Backtests optimiert.


## 11. Implementierungsstand – integrierte Fußball-Pipeline (18.11.2026)

Implementiert in `v2/src/models/football-pipeline.js`:
- verbindet die historische Teamstärken-Schätzung mit der Poisson-1X2-Berechnung;
- fordert standardmäßig mindestens 20 gültige abgeschlossene historische Spiele;
- liefert 1X2 und daraus abgeleitete Doppelte Chancen;
- gibt Anstoßzeit, Team-IDs, Datenumfang und effektive Teamstichproben mit aus;
- verwendet keine Wettquoten.

Isolierte Pipeline-Tests: 8 Fälle angelegt. Die zugehörige Browser-Testseite liegt unter `v2-test/football-pipeline-test.html`. Die Tests sind noch nicht im echten Browser ausgeführt worden; die Modellkomponenten wurden zuvor separat im JavaScript-Laufzeittest geprüft.

**Noch keine Produktionsfreigabe:** Die Pipeline benötigt reale, korrekt zugeordnete und lizenzkonforme historische Spieldaten. Die Mindestzahl 20 ist vorläufig und muss durch Walk-forward-Backtests je Liga geprüft werden. Es gibt noch keine Kalibrierung, keine Dixon-Coles-Korrektur und keine empirische Gütebewertung.


## 12. Walk-forward-Backtest – Implementierung

Datei: `v2/src/backtest/football-backtest.js`.

- Chronologische Auswertung: Für jedes Testspiel werden ausschließlich frühere abgeschlossene Spiele als Historie verwendet.
- Kennzahlen: Trefferquote, multiclass Brier Score und Log Loss; jeweils mit ausgewiesener Stichprobengröße.
- Spiele ohne ausreichende Historie oder Team-Heim-/Auswärtsstichprobe werden gezählt und mit Ablehnungsgrund ausgewiesen.
- Quoten werden nicht verwendet.
- Ein Browser-Test mit synthetischen Daten liegt unter `v2-test/football-backtest-test.html`. Dieser prüft die technische Auswertung, nicht die reale Prognosegüte.

**Grenze:** Ein Backtest ist erst aussagekräftig, wenn die historischen Resultate vollständig, korrekt zugeordnet und je Wettbewerb ausreichend umfangreich sind. Die Kennzahlen dürfen nicht über mehrere Ligen mit unterschiedlichen Datenqualitäten ungeprüft zusammengefasst werden. Vor einer Freigabe sind außerdem zeitliche Kalibrierung, Saisontrennung und ein Vergleich mit Baselines erforderlich.
