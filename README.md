Pré Mathy Ride
==============

Site vitrine statique (HTML, CSS, JS sans dépendance) de Pré Mathy Ride, balades en moto électrique Sur-Ron à Lesve.

- `index.html` : version française
- `en/index.html` : version anglaise
- `img/` : photos Avic Media en WebP (800 et 1600 px)
- `fonts/` : Bebas Neue et Source Sans 3, auto-hébergées

Le formulaire de réservation envoie les demandes à un Google Sheet (planning) via Google Apps Script : voir `const API` en haut de `script.js`. Tant que cette URL est vide, le formulaire ouvre un e-mail pré-rempli vers location@mathyridee.net. Le script et son guide d’installation sont conservés hors du dépôt public (dossier `apps-script/` à côté).
