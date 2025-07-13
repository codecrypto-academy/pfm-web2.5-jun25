# Comment générer des transactions avec Gas sur Besu

## 🔥 Quand le Gas apparaît dans Besu ?

### Situations qui consomment du Gas :

1. **Transfers simples** : 21,000 gas (minimum)
2. **Smart contracts** : 500,000+ gas (déploiement)
3. **Appels de fonctions** : Variable selon complexité
4. **Opérations de stockage** : Plus coûteux
5. **Boucles et calculs** : Proportionnel à la complexité

## 🚀 Générer des transactions

### 1. Installation
```bash
cd scripts
npm install
```

### 2. Générer quelques transactions
```bash
npm run generate
```

### 3. Déployer un contrat (beaucoup de gas)
```bash
npm run generate-contract
```

### 4. Mode continu (nouvelles transactions toutes les 10s)
```bash
npm run generate-continuous
```

## 📊 Ce que vous verrez

### Dans votre interface web :
- **Blocs vides** (0 TX) : Gris
- **Blocs avec transactions** : Orange avec indicateur "TX"
- **Gas utilisé** affiché pour chaque bloc

### Exemples de gas :
```
Transfer simple:     21,000 gas
Transfer avec data:  25,000+ gas
Déploiement contrat: 500,000+ gas
Appel de fonction:   45,000+ gas
```

## 🔧 Configuration

Le script utilise :
- **RPC Endpoint** : `http://localhost:18555`
- **Clé privée** : Compte préfinancé de votre réseau
- **Gas Limit** : Adapté selon le type de transaction

## 💡 Pourquoi le Gas en réseau privé ?

Même en privé, Besu :
1. **Mesure la complexité** des opérations
2. **Limite les ressources** par transaction
3. **Prévient les boucles infinies**
4. **Simule un environnement réaliste**

La différence : **Gas gratuit** (pas de coût réel) mais **limits conservées** !
