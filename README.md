# ToolsOp V2 Premium

Site boutique React/Vite avec design noir/rouge premium, pages complètes, animations, particules, glassmorphism et paiement PayPal côté serveur via Netlify Functions.

## Lancer en local

```bash
npm install
npm run dev
```

Le site s'ouvrira sur l'adresse affichée par Vite, souvent :

```txt
http://localhost:5173/
```

## Tester les fonctions Netlify + PayPal en local

Installe Netlify CLI si tu veux tester les paiements localement :

```bash
npm install -g netlify-cli
netlify dev
```

Crée un fichier `.env` à la racine du projet avec :

```env
PAYPAL_CLIENT_ID=ton_client_id_paypal
PAYPAL_CLIENT_SECRET=ton_client_secret_paypal
PAYPAL_ENV=sandbox
SITE_URL=http://localhost:8888
VITE_ADMIN_CODE=ToolsOPpa
```

## Passer en production

Sur Netlify, ajoute ces variables d'environnement dans :

`Site settings > Environment variables`

```env
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=live
SITE_URL=https://ton-site.netlify.app
VITE_ADMIN_CODE=code_admin_a_changer
```

## Paiement PayPal sécurisé

Le navigateur n'envoie jamais le prix. Il envoie seulement l'identifiant du produit. Le serveur récupère le vrai prix depuis `netlify/functions/_products.js`, crée la commande PayPal, puis vérifie à la capture :

- statut `COMPLETED`
- devise `EUR`
- montant exact
- produit existant côté serveur

## Produits

La liste visible côté site est dans :

`src/data/products.js`

La liste utilisée pour vérifier les paiements est dans :

`netlify/functions/_products.js`

Important : garde les prix synchronisés dans ces deux fichiers, car le serveur est la source de vérité pour PayPal.

## Panel admin

Le panel admin inclus est un panel de gestion visuel/local pour préparer les fiches produits et voir un tableau de bord de démonstration. Pour une vraie production, il faut connecter ce panel à une base de données sécurisée, par exemple Supabase, et protéger l'accès avec une vraie authentification.
