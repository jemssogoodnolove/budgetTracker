# Budget Tracker

Un tableau de bord de finances personnelles pour suivre les revenus et dépenses mensuels, visualiser les postes de dépenses par catégorie et gérer le remboursement d'une dette — le tout stocké localement dans le navigateur.

## Fonctionnalités

- **Dashboard** — graphique revenus vs dépenses, répartition des dépenses par catégorie (donut + barres), indicateurs clés (revenu moyen, dépenses moyennes, solde mensuel, dette restante)
- **Importer un mois** — saisie manuelle des crédits et débits de chaque mois, avec détail optionnel par catégorie (alimentation, carburant, sorties, voyages, supermarchés, transports, divers)
- **Dette & remboursement** — enregistrement des versements, suivi de la progression par rapport à un montant configurable, simulation de l'échéance avec un curseur interactif
- **Conseils** — analyse automatique des données : équilibre budgétaire, alertes sur les postes de dépenses élevés, progression du remboursement
- **Export PDF** — impression de la vue courante directement depuis le navigateur
- **Export e-mail** — génération d'un résumé textuel envoyé via le client mail par défaut

## Utilisation

Aucune installation ni compilation requise. Ouvre `index.html` directement dans un navigateur moderne.

Les données sont sauvegardées dans le `localStorage` du navigateur (clé `budget_tracker_v1`) et persistent entre les sessions. Rien n'est transmis à un serveur.

## Structure du projet

```
index.html   — Structure HTML
style.css    — Styles (thème sombre, variables CSS, responsive)
app.js       — Logique applicative (état, rendu, intégration Chart.js, exports)
```

Chart.js 4.4.1 est chargé depuis un CDN (`cdnjs.cloudflare.com`).

## Modèle de données

```js
{
  months: [{ year, month, credits, debits, cats: { food, fuel, night, travel, shop, transport, other } }],
  repayments: [{ date, amount, note }],
  debt: { total, rate }
}
```

Les numéros de mois suivent la convention JavaScript (0 = janvier, 11 = décembre).

## Réinitialiser les données

Pour effacer toutes les données, exécute dans la console du navigateur :

```js
localStorage.removeItem('budget_tracker_v1');
location.reload();
```
