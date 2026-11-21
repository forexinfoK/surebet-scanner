SUREBET SCANNER MOBILE v1.3.5

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
- Fußball 1X2: maximal 5 Tipps, mindestens 70 % Modellwahrscheinlichkeit und ausschließlich mit aktuellem positivem Value-Signal sowie erfasster Quote.
- Fußball X1/X2: maximal 5 Tipps, mindestens 75 % Modellwahrscheinlichkeit; daraus abgeleitete Wahrscheinlichkeit, keine eigenständige Prognose und keine bestätigte Value-/Quotenprüfung.
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


VERSION 1.3.1 – RISIKO-TIPPS FUßBALL
- Neuer eigener Bereich „Risiko“ für Fußball-1X2-Tipps.
- Maximal 2 Risiko-Tipps pro österreichischem Kalendertag/Suchlauf.
- Modellwahrscheinlichkeit: mindestens 45 % und unter 65 %.
- Erfasste Soft-Quote: mindestens 1.70.
- Positiver erwarteter Wert (EV) von mindestens 3 % erforderlich (EV = Modellwahrscheinlichkeit × Quote − 1).
- Es werden ausschließlich Tipps mit einem aktuellen TipsAudit-Value-Signal berücksichtigt; reine Wahrscheinlichkeitsauswahlen ohne bestätigte Quote kommen nicht in den Risikobereich.
- Auswahl der maximal zwei Tipps nach höchstem EV; keine künstliche Auffüllung.
- Normale Fußball-1X2-, X1/X2- und Tennisfilter bleiben unverändert.
- Modellwahrscheinlichkeiten und EV sind Schätzwerte und keine Gewinnzusage.


VERSION 1.3.2 – KOSTENLOSE FUSSBALL-TORMÄRKTE IM RISIKOBEREICH
- Der Risiko-Bereich kann zusätzlich zu vorhandenen 1X2-Value-Tipps nun BTTS (Beide Teams treffen), Über/Unter 2,5 Tore, Über/Unter 3,5 Tore sowie Team erzielt ein Tor prüfen.
- Neue Datenquelle: OpenLigaDB (https://api.openligadb.de), kostenlos und ohne API-Schlüssel. Es werden nur ausgewählte Ligen mit ausreichender Saisonhistorie verwendet.
- Die Torwahrscheinlichkeiten werden mit einem einfachen Poisson-Modell aus bisherigen Ligaergebnissen geschätzt. Mindestens 8 abgeschlossene Ligaspiele insgesamt und mindestens 4 Spiele je beteiligtem Team sind erforderlich.
- Es werden maximal 2 Risiko-Tipps ausgegeben; keine künstliche Auffüllung.
- WICHTIG: OpenLigaDB liefert Ergebnisse/Spielpläne, keine Buchmacherquoten. Die angezeigte faire Modellquote ist keine tatsächlich verfügbare Wettquote. Für diese Modell-Tormärkte kann daher kein positiver EV bestätigt werden. Vor einer Wette muss die aktuelle Quote selbst geprüft werden.
- Die bisherigen Fußball- und Tennisbereiche bleiben in ihrer Logik unverändert.
- OpenLigaDB-Daten stehen unter ODbL 1.0; Abrufe bitte sparsam verwenden.


VERSION 1.3.3 – STRENGERER FUSSBALLFILTER
- 1X2: Mindestwahrscheinlichkeit von 65 % auf 70 % erhöht; maximal 5 Tipps.
- 1X2-Ersatz-/Wahrscheinlichkeitsauswahlen ohne bestätigtes aktuelles Value-Signal wurden entfernt. Ein 1X2-Tipp erscheint nur noch mit gültiger Auswahl, erfasster Quote oberhalb der fairen Modellquote und positivem EV.
- X1/X2: Mindestwahrscheinlichkeit von 60 % auf 75 % erhöht; maximal 5 Tipps. Diese Auswahl bleibt eine Ableitung aus 1X2-Wahrscheinlichkeiten und ist keine unabhängige Prognose. Ohne passende Marktquote kann kein positiver EV bestätigt werden.
- Doppelte Spiele werden anhand der besseren verfügbaren Prognose zusammengeführt; die Ausgabe wählt die höchsten Wahrscheinlichkeiten statt einfach die frühesten Spiele.
- Ungültige TipsAudit-Wahrscheinlichkeitsverteilungen (Summe außerhalb 95–105 %) werden verworfen.
- Risiko-Bereich, Tennis-Bereich und deren Filter wurden nicht geändert.
- Hinweis: Strengere Filter können dazu führen, dass an manchen Tagen deutlich weniger oder gar keine Fußballtipps angezeigt werden. Das ist beabsichtigt; es werden keine Tipps aufgefüllt.


Version 1.3.4 – Korrektur der sichtbaren Tippbegrenzung
- Anzeige für Fußball 1X2 und X1/X2 auf maximal 5 Tipps pro Suchlauf korrigiert.
- Interne Begrenzung bleibt MAX=5.
- Service-Worker-Cache auf v1.3.5 erhöht, damit Browser die aktualisierten Dateien neu laden.
\n\nVersion 1.3.5: Cache-Aktualisierung mit sofortiger Aktivierung des neuen Service Workers und Versionsparameter für app.js. Zusätzlich wird die maximale Zahl der sichtbaren Fußball- und X1/X2-Karten direkt beim Rendern auf 5 begrenzt.\n