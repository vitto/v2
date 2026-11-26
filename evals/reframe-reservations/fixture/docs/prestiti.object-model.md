# Prestiti - modello degli oggetti

Lo strumento di circolazione della Biblioteca civica: i bibliotecari prestano le copie dei titoli
ai lettori e le riprendono. Formato: object model del plugin v2.

## 1. Obiettivo

Ogni copia e' sul suo scaffale o in prestito a un lettore noto, con una scadenza; nessuna copia si
perde tra il banco e lo scaffale. Fatto, per un prestito: la copia e' tornata ed e' di nuovo sul
suo scaffale. Fatto, per il tutto: il report mensile parte per il Comune entro il 5 del mese.
(la persona)

Il cambiamento: i bibliotecari smettono di cercare a mano chi ha una copia; i lettori ricevono un
avviso prima della scadenza. (la persona)

## 2. Persone

- **Bibliotecario al banco**: presta e riprende le copie, risponde ai lettori. Il percorso di
  oggi: legge la tessera, legge il codice della copia, registra il prestito; al ritorno riprende
  la copia e la rimette sullo scaffale. Vuole sentirsi veloce: un prestito in meno di un minuto.
  (la persona)
- **Responsabile della biblioteca**: manda ogni mese il report dei prestiti al Comune. (la persona)

## 3. Metafora e vocabolario

Titoli, copie, lettori, prestiti: i nomi del registro in `GLOSSARY.md` (`title`, `copy`,
`reader`, `loan`). Oggi: un registro cartaceo dei prestiti al banco. (il progetto, GLOSSARY.md)

## 4. Entita'

Gerarchia: Catalogo > Titolo > Copia. Lettore. Prestito (si riferisce a una copia e a un lettore).

### Titolo

- **Scopo**: l'opera che i lettori cercano.
- **Contiene**: autore, edizione, soggetto.
- **Figli**: le copie, come righe nella Scheda titolo.
- **Azioni**: aggiungere una copia.
- **Stati**: disponibile (almeno una copia sullo scaffale), tutto in prestito.
- **Sempre visibile**: quante copie sono sullo scaffale.

### Copia

- **Scopo**: l'oggetto che si presta.
- **Contiene**: collocazione, codice, stato.
- **Azioni**: prestare, riprendere, segnare come persa.
- **Stati**: sullo scaffale, in prestito, persa.
- **Sempre visibile**: lo stato, e a chi e' in prestito.

### Lettore

- **Scopo**: chi prende in prestito.
- **Contiene**: nome, tessera, recapito per gli avvisi.
- **Figli**: nessuno; i suoi prestiti sono riferimenti.
- **Azioni**: aggiornare i dati, sospendere la tessera.
- **Stati**: attivo, sospeso.
- **Sempre visibile**: se la tessera e' attiva, e i prestiti scaduti.

### Prestito

- **Scopo**: una copia data a un lettore fino a una scadenza.
- **Contiene**: data, scadenza, avviso mandato.
- **Azioni**: registrare, chiudere al ritorno, prorogare.
- **Stati**: in corso, scaduto, chiuso.
- **Sempre visibile**: la scadenza.

## 5. Viste

### Catalogo

- **Entita' focale**: il catalogo. **Obiettivo**: trovare un titolo.
- **Intorno**: i titoli come righe, con il numero di copie sullo scaffale; il titolo si apre sulla
  sua pagina.
- **Mai qui**: i prestiti, i lettori.
- **Entrata e uscita**: dal menu; verso la Scheda titolo.

### Scheda titolo

- **Entita' focale**: il titolo. **Obiettivo**: sapere dove sono le sue copie.
- **Intorno**: le copie in linea, come righe (collocazione, stato); il prestito di una copia solo
  come stato sulla riga, con il nome del lettore che apre la Scheda lettore.
- **Mai qui**: i dati del lettore.
- **Entrata e uscita**: dal Catalogo; verso la Scheda lettore.

### Scheda lettore

- **Entita' focale**: il lettore. **Obiettivo**: vedere e aggiornare un lettore e i suoi prestiti.
- **Intorno**: i dati del lettore, modificabili in linea; i prestiti come righe, con la scadenza.
- **Mai qui**: il catalogo.
- **Entrata e uscita**: dalla tessera letta al banco o da una Scheda titolo; verso il Banco prestiti.

### Banco prestiti

- **Entita' focale**: il prestito. **Obiettivo**: prestare e riprendere una copia in meno di un
  minuto.
- **Intorno**: la copia letta dal codice, il lettore letto dalla tessera, solo il nome.
- **Mai qui**: la ricerca nel catalogo.
- **Entrata e uscita**: la vista di partenza al banco; si esce sul prestito successivo.

### Report mensile

- **Entita' focale**: il report del mese. **Obiettivo**: compilare il modulo del Comune, il numero
  di prestiti del mese per fascia d'eta' dei lettori.
- **Intorno**: solo i campi del modulo.
- **Mai qui**: titoli, copie o lettori singoli; qualsiasi numero che il modulo non chiede.
- **Entrata e uscita**: dal menu, una volta al mese; si esce mandando il modulo.

## 6. Il macchinario

Un job notturno manda l'avviso di scadenza ai lettori: si vede solo come "avvisato" sul prestito.

## 7. Il design system

Nessun design system: HTML e i fogli di stile della biblioteca.

## 8. Conflitti

Nessuno aperto.

## 9. Contesto

Il banco ha un lettore di codici a barre e un solo schermo; i bibliotecari lavorano in piedi.

## 10. Domande aperte

Nessuna.

## 11. Eccezioni

Nessuna.
