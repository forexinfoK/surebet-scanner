# Surebet Scanner 2.0 – Einheitliches Datenmodell

Stand: 18.11.2026  
Branch: `v2.0-development`

## 1. Zweck

Alle Datenquellen liefern unterschiedliche Feldnamen, Zeitformate und Statuswerte. Die Anwendung soll deshalb nicht direkt mit den Rohantworten der Anbieter arbeiten. Jeder Adapter übersetzt seine Antwort in ein gemeinsames internes Match-Format.

Dieses Dokument definiert die fachliche Struktur und die Validierungsregeln. Es ist noch keine Implementierung und gibt keine Datenquelle zur produktiven Nutzung frei.

## 2. Gemeinsame Match-Struktur

Jeder Datensatz beschreibt genau ein angesetztes oder bereits begonnenes Sportereignis.

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---:|---|
| `event_id` | String | ja | Interne, stabile ID des Ereignisses |
| `sport` | Enum | ja | `football` oder `tennis` |
| `competition_id` | String | ja | Interne Wettbewerbs-ID |
| `competition_name` | String | ja | Anzeigename des Wettbewerbs |
| `season` | String | soweit verfügbar | Saisonkennung |
| `scheduled_start_utc` | ISO-8601 UTC | ja | Geplanter Beginn in UTC |
| `status` | Enum | ja | Normalisierter Spielstatus |
| `participants` | Objekt | ja | Teilnehmer gemäß Sportart |
| `source_records` | Array | ja | Herkunft und Abrufinformationen |
| `data_quality` | Objekt | ja | Qualitätsmerkmale und Ausschlussgründe |
| `last_verified_at_utc` | ISO-8601 UTC | ja | Zeitpunkt der letzten erfolgreichen Prüfung |

Die Anzeigezeit wird aus UTC in die Zeitzone `Europe/Vienna` umgerechnet. Eine lokale Uhrzeit darf nie als UTC gespeichert werden.

## 3. Sportartspezifische Teilnehmer

### Fußball

`participants.home_team` und `participants.away_team` enthalten jeweils:
- `entity_id`: interne Team-ID
- `name`: kanonischer Teamname
- `source_name`: Name, wie ihn die jeweilige Quelle liefert
- `source_entity_id`: externe ID, sofern vorhanden

Heim- und Auswärtsteam dürfen nicht vertauscht werden. Ein Datensatz ohne eindeutig identifizierbare beide Teams ist nicht prognosefähig.

### Tennis

`participants.player_a` und `participants.player_b` enthalten jeweils:
- `entity_id`: interne Spieler-ID
- `name`: kanonischer Spielername
- `source_name`: Name, wie ihn die jeweilige Quelle liefert
- `source_entity_id`: externe ID, sofern vorhanden
- `tour`: `ATP` oder `WTA`

Zusätzliche optionale Match-Felder:
- `round`: Runde
- `surface`: `hard`, `clay`, `grass` oder `unknown`
- `format`: z. B. Best-of-3 oder Best-of-5, wenn verlässlich vorhanden

Die Zuordnung zweier Spieler darf nicht allein anhand eines ähnlichen Namens erfolgen. Bei Namensgleichheit oder unklarer Identität wird das Match bis zur Klärung ausgeschlossen.

## 4. Status-Normalisierung

Zulässige interne Statuswerte:
- `scheduled`: angesetzt, noch nicht begonnen
- `live`: läuft bereits
- `completed`: beendet
- `postponed`: verschoben
- `cancelled`: abgesagt
- `suspended`: unterbrochen
- `unknown`: Status nicht sicher bestimmbar

Für die tägliche Tipp-Auswahl sind ausschließlich Matches mit Status `scheduled` zulässig. `unknown` wird nicht als angesetzt interpretiert. Live-, beendete, verschobene, abgesagte und unterbrochene Spiele werden ausgeschlossen.

## 5. Herkunft und Aktualität

Jeder Adapter muss pro Abruf mindestens protokollieren:
- `source_id`: eindeutige Kennung der Quelle
- `source_event_id`: Ereignis-ID beim Anbieter, sofern vorhanden
- `fetched_at_utc`: Abrufzeitpunkt
- `source_updated_at_utc`: Aktualisierungszeitpunkt der Quelle, sofern vorhanden
- `http_status`: HTTP-Status
- `adapter_version`: Version des verwendeten Adapters

Ein erfolgreicher HTTP-Status allein bedeutet nicht, dass die Daten aktuell oder vollständig sind. Fehlt ein belastbarer Zeitstempel, wird die Aktualität als unbekannt markiert und nicht stillschweigend angenommen.

## 6. Datenqualität und Ausschlussregeln

Vorgesehene Qualitätsstufen:
- `A`: Identität, Wettbewerb, Startzeit und Status eindeutig; Quelle aktuell und technisch plausibel
- `B`: grundsätzlich verwendbar, aber mit dokumentierter Einschränkung, die das Modell nicht wesentlich beeinträchtigt
- `C`: unvollständig, widersprüchlich, veraltet oder nicht ausreichend verifiziert

Regeln:
1. Qualität C wird nicht für Tipps verwendet.
2. Fehlende Pflichtfelder führen zum Ausschluss.
3. Widersprüchliche Startzeiten oder Teilnehmer zwischen Quellen müssen vor einer Zusammenführung geklärt werden.
4. Ein fehlender Status ist kein Beleg für `scheduled`.
5. Daten dürfen nicht durch geschätzte Werte ergänzt werden, nur um ein Match anzeigen zu können.
6. Ausschlussgrund wird maschinenlesbar gespeichert und in der Diagnose verständlich angezeigt.

Beispiele für Ausschlusscodes:
- `MISSING_PARTICIPANT`
- `AMBIGUOUS_IDENTITY`
- `MISSING_START_TIME`
- `STALE_SOURCE_DATA`
- `UNKNOWN_STATUS`
- `CONFLICTING_FIXTURE`
- `UNSUPPORTED_COMPETITION`

## 7. Zusammenführung mehrerer Quellen

Quellen werden nicht allein aufgrund gleicher Team-/Spielernamen zusammengeführt.

Priorität der Zuordnung:
1. identische, verifizierte externe Ereignis-ID (wenn dieselbe Quelle)
2. eindeutige Teilnehmer-IDs plus kompatibler Wettbewerb und Startzeit
3. Name, Wettbewerb und Startzeit nur als Kandidatenabgleich – bei Unsicherheit keine automatische Zusammenführung

Bei abweichenden Startzeiten wird nicht einfach ein Mittelwert gebildet. Die Anwendung prüft, ob eine Quelle eine spätere Spielplanänderung meldet. Ohne klare Auflösung bleibt der Datensatz gesperrt.

## 8. Trennung von Daten, Prognosen und Quoten

Das Match-Objekt enthält keine Modellwahrscheinlichkeit und keine Quote.

Separat zu speichern:

### Prognose
- `prediction_id`
- `event_id`
- `model_name` und `model_version`
- `generated_at_utc`
- `probabilities`
- `data_quality_at_prediction`
- `explanation`
- `eligible_for_display`

### Quote (optional, später)
- `event_id`
- `market`
- `selection`
- `odds_decimal`
- `source_id`
- `observed_at_utc`

Quoten dürfen Modellwahrscheinlichkeiten nicht unbemerkt verändern. Eine Value-/EV-Berechnung ist ein eigener, optionaler Auswertungsschritt.

## 9. Tagesfilter für Österreich

- Tagesansicht verwendet das österreichische Kalenderdatum in `Europe/Vienna`.
- Der Filter wird auf Basis des konvertierten geplanten Beginns berechnet.
- Speicherung und Vergleiche erfolgen in UTC.
- Bei Sommer-/Winterzeitwechseln wird eine Zeitzonenbibliothek verwendet; keine manuelle Addition eines fixen Stundenwerts.
- Die Tagesansicht zeigt nur zukünftige, eindeutig als `scheduled` bestätigte Matches des ausgewählten österreichischen Tages.

## 10. Abnahmekriterien vor Modellnutzung

Ein Adapter gilt erst dann als fachlich verwendbar, wenn:
- Pflichtfelder zuverlässig geliefert und korrekt normalisiert werden
- Team-/Spieleridentitäten eindeutig zugeordnet werden
- Statuswerte korrekt übersetzt werden
- UTC-Zeit und lokale Anzeigezeit nachweislich stimmen
- Aktualität und Abrufzeit nachvollziehbar sind
- leere, fehlerhafte und widersprüchliche Antworten sicher behandelt werden
- Abdeckung der vorgesehenen Wettbewerbe separat dokumentiert ist
- Lizenz und zulässige Nutzung geprüft sind

Ein bestandener technischer Abruf ist keine Lizenzfreigabe und noch keine Freigabe für Prognosen.

## 11. Nächster Umsetzungsschritt

Nach dieser Spezifikation wird zuerst ein kleiner, isolierter Normalisierungs-Prototyp erstellt. Er soll Testantworten in das gemeinsame Format überführen und automatisiert Pflichtfelder, Status, Identität und Zeitzone prüfen. Erst danach wird ein einzelner Datenadapter für einen ausgewählten Wettbewerb angeschlossen.

Keine Änderung an `main`, Version 1.3.0 oder der veröffentlichten PWA.
