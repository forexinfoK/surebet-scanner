# Surebet Scanner 2.0 – Architektur- und Entwicklungsplan

## Grundsatz: Version 1.3.0 bleibt unangetastet

Die bestehende Hauptversion `main` ist die Referenzversion 1.3.0. Änderungen für Version 2.0 erfolgen ausschließlich im Branch `v2.0-development`. Es werden keine Änderungen in `main` übernommen und keine bestehende Veröffentlichung ersetzt, solange dies nicht ausdrücklich freigegeben wurde.

## Ziel

Eine eigenständige, parallel testbare Version für Fußball und Tennis entwickeln. Qualität, nachvollziehbare Datenbasis und robuste Fehlerbehandlung haben Vorrang vor einer künstlich hohen Zahl an Tipps. Es werden keine Tipps erzeugt, wenn die Datenlage nicht ausreicht.

## Leitplanken

- Kostenlose Datenquellen bevorzugen; Nutzungsbedingungen, Lizenz, API-Limits und kommerzielle Einschränkungen vor Integration prüfen.
- Wettquoten sind kein notwendiger Bestandteil der Modellwahrscheinlichkeit. Falls später Quoten/EV angezeigt werden, getrennt vom Modell ausweisen.
- Nur Spiele des aktuellen österreichischen Kalendertages berücksichtigen, sofern der Nutzer diese Tagesansicht beibehält; Startzeit und Spielstatus validieren.
- Keine automatischen Wetteinsätze und kein automatisches Speichern aller Vorschläge. Der Nutzer speichert nur selbst platzierte Tipps.
- Keine Performance- oder Gewinnversprechen.
- Fehlende, veraltete oder widersprüchliche Daten führen zum Ausschluss bzw. zu einer klaren Kennzeichnung, nicht zu erfundenen Werten.

## Bestandsaufnahme von 1.3.0 (nur lesend geprüft)

- Frontend: statische PWA mit `index.html`, `app.js`, `style.css`, Manifest und Service Worker.
- Fußballdaten: TipsAudit und Skorbot.
- Fußball 1X2: Mindestwahrscheinlichkeit 65 %; die Anwendung kann neben Value-Signalen auch eine reine Wahrscheinlichkeitsauswahl anzeigen. Diese beiden Arten müssen in 2.0 strikt getrennt bleiben.
- X1/X2: aktuell aus 1X2-Wahrscheinlichkeiten abgeleitet und nicht unabhängig modelliert.
- Tennis: TIPERO-Picks und ESPN-Spielplan; im Quelltext sind außerdem Funktionen für historische Daten/Modellberechnung vorhanden und müssen vor einer Neuentwicklung vollständig geprüft werden.
- Im geprüften `app.js` wurde keine Supabase-Integration gefunden. Supabase ist daher eine mögliche Architekturentscheidung für 2.0, aber kein bestätigter Bestandteil von 1.3.0.
- Bestehende PWA- und Hauptbranch-Dateien werden nicht geändert.

## Zielarchitektur 2.0

1. **Datenadapter**: je Quelle ein eigener Adapter mit Timeout, HTTP-/JSON-Prüfung, Zeitstempel, Quellenkennung und Fehlerstatus.
2. **Normalisiertes Match-Modell**: Sport, Wettbewerb, Saison, Teilnehmer, Startzeit in UTC, lokalisierte Anzeigezeit, Status, Quelle und Datenqualitätsmerkmale.
3. **Feature-Berechnung**: ausschließlich aus vor dem Spiel verfügbaren Informationen; keine Verwendung späterer Ergebnisse (Leakage).
4. **Getrennte Prognosemodelle**:
   - Fußball: 1X2-Modell; Doppelte Chance separat kalibriert bzw. aus dem konsistenten 1X2-Vektor abgeleitet und klar als abgeleitet bezeichnet. Modellierung u. a. mit Heim-/Auswärtsstärke, Torleistung, Gegnerstärke, Form und Wettbewerbsniveau, soweit Daten vollständig und vergleichbar sind.
   - Tennis: getrennte ATP-/WTA-Bewertung; Elo gesamt und nach Belag, Serve-/Return-Kennzahlen und jüngste Form nur bei ausreichender, zeitlich korrekter Datenbasis. H2H und Belastung nur ergänzend und mit ausreichender Datenqualität.
5. **Kalibrierung und Auswahl**: Wahrscheinlichkeiten müssen auf historischen, zeitlich getrennten Daten kalibriert werden. Keine Mindestquote als Ersatz für Modellqualität.
6. **Ergebnisprotokoll**: Modellversion, Datenstand, Prognosezeitpunkt, Wahrscheinlichkeit, Auswahlgrund und Ausschlussgrund nachvollziehbar speichern.
7. **Darstellung**: Modellwahrscheinlichkeit, Datenqualität und Tippart (Modellprognose/Value-Signal) sichtbar trennen.
8. **Optionale Backend-Schicht**: Supabase kann später für Authentifizierung, Synchronisierung und serverseitige Datenabrufe geprüft werden. Keine Schlüssel im Frontend; Service-Role-Schlüssel niemals veröffentlichen.

## Datenquellen – Prüfstatus

Noch keine Quelle ist für 2.0 verbindlich freigegeben. Vor der Integration wird für jede Quelle dokumentiert:
- Abdeckung (Ligen/Touren, Saisons, Live-/historische Daten)
- Aktualität und Vollständigkeit
- kostenlose Nutzung, Rate Limits und API-Key-Anforderungen
- Lizenz und zulässige Nutzung
- Stabilität, CORS und technische Zugriffsmöglichkeit

Historische Tennisdaten von Jeff Sackmann sind laut bestehender Projektdokumentation mit CC BY-NC-SA 4.0 gekennzeichnet. Lizenzbedingungen und konkrete Datenpakete müssen vor einer erneuten Nutzung separat geprüft werden.

## Test- und Freigabeprozess

1. Datenadapter einzeln testen und Rohantworten/Fehler nachvollziehbar protokollieren.
2. Historische Tests chronologisch durchführen (Walk-forward); keine zufällige Vermischung von Vergangenheit und Zukunft.
3. Mindestens Brier Score und Log Loss, Kalibrierung nach Wahrscheinlichkeitsklassen sowie Trefferquote ausweisen.
4. Ergebnisse nach Sport, Wettbewerb, Markt und Datenqualität aufschlüsseln; Stichprobengröße immer mitangeben.
5. Parallelbetrieb gegen 1.3.0 mit identischen Spielen und Prognosezeitpunkten.
6. Erst nach ausreichender Stichprobe und ausdrücklicher Nutzerfreigabe wird über eine Veröffentlichung entschieden.

## Aktueller Status

- [x] Repository lesend geprüft
- [x] Separaten Entwicklungsbranch `v2.0-development` von `main` erstellt
- [ ] Vollständige Prüfung der bestehenden Tennis-Modellfunktionen und Datenadapter
- [ ] Datenquellen- und Lizenzprüfung
- [ ] Technische Spezifikation der Fußball- und Tennismodelle
- [ ] Implementierung und automatisierte Tests
- [ ] Historischer Walk-forward-Test
- [ ] Parallelvergleich mit 1.3.0
- [ ] Nutzerfreigabe vor Veröffentlichung
