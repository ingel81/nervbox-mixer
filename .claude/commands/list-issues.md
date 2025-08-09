# List Issues Command

Hole alle GitHub Issues und bereite sie strukturiert auf.

## Anweisung
```bash
gh issue list --state all --limit 50 --json number,title,state,createdAt,updatedAt,labels
```

## Ausgabe Format
- Strukturierte Tabelle mit offenen und geschlossenen Issues
- Kategorisierung nach Features/Bugfixes/Tech Improvements  
- Status-Icons (🔴 offen, ✅ geschlossen, 🟡 neu)
- Statistiken und Prioritäten
- Markdown-Format mit Übersichten