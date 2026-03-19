# KOB-KERAMIKA App

Web aplikacija za upravljanje troškovnicima, mjerenjima i situacijama u građevinskim projektima.  
Izgrađena kao jednostrana aplikacija (SPA) s Firebase autentifikacijom i Firestore bazom podataka.

---

## Sadržaj

- [Značajke](#značajke)
- [Postavljanje Firebase projekta](#postavljanje-firebase-projekta)
- [Konfiguracija aplikacije](#konfiguracija-aplikacije)
- [Pokretanje lokalno](#pokretanje-lokalno)
- [Struktura projekta](#struktura-projekta)
- [Korištenje aplikacije](#korištenje-aplikacije)
- [Demo mod](#demo-mod)

---

## Značajke

- 🔐 **Prijava i registracija** putem Firebase Authentication
- ⏳ **Čekanje odobrenja** – novi korisnici moraju biti odobreni od administratora
- 📋 **Troškovnik** – unos stavki s pozicijom, opisom, jedinicom mjere, cijenom i količinom
- 📐 **Unos mjera** (Građevinska knjiga)
- 📊 **Situacije** – privremene i okončane obračune
- 🗂️ **Upravljanje projektima** – višestruki projekti s neovisnim podacima
- 🎨 **Teme** – Tamna, Svijetla i Premium vizualni stil
- 📱 **PWA** – mogućnost instalacije kao aplikacija na mobilnom uređaju
- ☁️ **Firebase sinkronizacija** – pohrana podataka u oblaku

---

## Postavljanje Firebase projekta

### 1. Kreiranje Firebase projekta

1. Idite na [https://console.firebase.google.com](https://console.firebase.google.com)
2. Kliknite **"Add project"** (Dodaj projekt)
3. Unesite naziv projekta (npr. `kob-keramika`) i slijedite upute
4. Onemogućite Google Analytics ako nije potreban

### 2. Aktiviranje Authentication

1. U Firebase konzoli idite na **Build → Authentication**
2. Kliknite **"Get started"**
3. Pod karticom **"Sign-in method"** omogućite **Email/Password**

### 3. Kreiranje Firestore baze

1. U Firebase konzoli idite na **Build → Firestore Database**
2. Kliknite **"Create database"**
3. Odaberite lokaciju servera (preporučuje se `europe-west` za Hrvatsku)
4. Pokrenite u **Production mode**

### 4. Postavljanje Firestore pravila sigurnosti

U Firebase konzoli, **Firestore → Rules**, zamijenite postojeća pravila:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Korisnici mogu čitati/pisati vlastite dokumente
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Administratori mogu čitati sve korisnike
      allow read: if request.auth != null
                  && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Projekti i troškovnici – samo vlasnik
    match /projects/{projectId}/{document=**} {
      allow read, write: if request.auth != null
                         && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

### 5. Dohvaćanje Firebase konfiguracije

1. U Firebase konzoli idite na **Project settings** (ikona zupčanika)
2. Pod **"Your apps"** kliknite **"Add app"** → web ikona `</>`
3. Registrirajte aplikaciju i kopirajte `firebaseConfig` objekt

---

## Konfiguracija aplikacije

Otvorite datoteku `main.js` i zamijenite placeholder vrijednosti u objektu `FIREBASE_CONFIG`:

```js
const FIREBASE_CONFIG = {
  apiKey:            "VAŠA_API_KEY_OVDJE",
  authDomain:        "VAŠ_PROJEKT_ID.firebaseapp.com",
  projectId:         "VAŠ_PROJEKT_ID",
  storageBucket:     "VAŠ_PROJEKT_ID.appspot.com",
  messagingSenderId: "VAŠ_MESSAGING_SENDER_ID",
  appId:             "VAŠ_APP_ID",
};
```

Zatim u `index.html` **odkomentirajte** Firebase SDK skripte:

```html
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
```

### Postavljanje prvog administratora

1. Registrirajte se u aplikaciji (kreirajte prvi račun)
2. U Firebase konzoli, **Firestore → Data**, otvorite kolekciju `users`
3. Pronađite dokument s vašim UID-om
4. Uredite polja:
   - `approved`: `true`
   - `role`: `"admin"`

---

## Pokretanje lokalno

Aplikacija je čista HTML/CSS/JS – **nije potreban build korak**.

### Opcija A: VS Code Live Server

1. Instalirajte ekstenziju [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Desni klik na `index.html` → **"Open with Live Server"**

### Opcija B: Python HTTP server

```bash
# Python 3
python -m http.server 8080
```

Zatim otvorite [http://localhost:8080](http://localhost:8080) u pregledniku.

### Opcija C: Node.js `serve`

```bash
npx serve .
```

### Opcija D: Deploy na Surge

```bash
npx surge . kob-keramika.surge.sh
```

---

## Struktura projekta

```
kob-keramika-app/
├── index.html      # Glavna HTML datoteka (SPA)
├── style.css       # Stilovi (tamna/svijetla/premium tema)
├── main.js         # Aplikacijska logika + Firebase integracija
├── .gitignore      # Git ignore pravila
└── README.md       # Ova dokumentacija
```

---

## Korištenje aplikacije

### Navigacija

Koristite bočnu traku (sidebar) za navigaciju između pogleda:

| # | Pogled | Opis |
|---|--------|------|
| 1 | **Troškovnik** | Dodajte i upravljajte stavkama troškovnika |
| 2 | **Unos Mjera** | Unesite izmjerene količine za svaku poziciju |
| 3 | **Pregled (Građ. Knjiga)** | Pregledajte sva unesena mjerenja |
| 4 | **Troškovnik Situacije** | Generirajte privremene i okončane situacije |

### Projekti

- Kliknite **+** pored "Odabrani Projekt" za kreiranje novog projekta
- Svaki projekt ima vlastite stavke troškovnika i mjerenja
- Koristite gumbe **Preimenuj** i **Obriši** za upravljanje projektima

### Troškovnik

1. Unesite **Poziciju** (npr. `1.1`), **Opis stavke**, **J.Mjera** (npr. `m²`)
2. Unesite **Cijenu** u eurima i **Količinu**
3. Kliknite **Dodaj Stavku**
4. Tablica automatski izračunava ukupan iznos

### Teme

Kliknite na **"🎨 Izgled aplikacije (Tema)"** u bočnoj traci i odaberite:
- **Tamna** – Zadana, pogodna za rad
- **Svijetla** – Za dobro osvijetljene prostore
- **Premium** – Ljubičasti vizualni stil

---

## Demo mod

Ako Firebase nije konfiguriran (vrijednosti u `FIREBASE_CONFIG` počinju s `TODO`),
aplikacija radi u **demo modu**:

- Prijava s bilo kojim ispravnim emailom i lozinkom (min. 6 znakova) **odmah otvara dashboard**
- Podaci se pohranjuju u `localStorage` preglednika (lokalno, bez sinkronizacije)
- Registracija prikazuje overlay "čekanje odobrenja" (simulacija)

> ⚠️ **Demo mod nije namijenjen za produkcijsku upotrebu.**  
> Za pravi rad uvijek konfigurirajte Firebase.

---

## Licenca

Projekt je privatni poslovni alat. Sva prava pridržana.
