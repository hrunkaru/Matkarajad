# Harjumaa Matkarajad

Veebileht Harjumaa matka-, tervise-, loodus- ja õpperadadest. Hostitud GitHub Pages'il.

## Funktsioonid

- **Radade nimekiri** - 35+ Harjumaa rada koos pikkuse, tüübi, hooaja ja asukoha infoga
- **Filtreerimine** - Radade filtreerimine kategooria, pikkuse, hooaja ja asukoha järgi
- **Sisselogimine** - GitHub PAT-põhine autentimine
- **Personaalsed andmed** - Märgi radasid tehtuks, lisa kommentaare (krüpteeritud)

## Tehnoloogia

- Puhas HTML/CSS/JavaScript (ilma build-protsessita)
- GitHub Pages hosting
- GitHub API andmete salvestamiseks
- AES-GCM krüpteerimine (Web Crypto API)

## Kasutamine

### Ilma sisselogimata
Kõik rajad on nähtavad ja filtreeritavad kõigile.

### Sisselogituna
1. Loo [GitHub Personal Access Token](https://github.com/settings/tokens?type=beta) (fine-grained)
2. Anna tokenile `Contents` õigus (read and write) sellele repositooriumile
3. Sisesta token ja vali parool
4. Märgi radasid tehtuks ja lisa kommentaare

## Andmete turvalisus

- Kasutaja andmed krüpteeritakse AES-GCM algoritmiga
- Parool ei salvestata serverisse (ainult valikuliselt brauserisse)
- Krüpteeritud andmed salvestatakse kasutaja enda GitHub reposse

## Allikad

- [RMK Loodusega Koos](https://loodusegakoos.ee)
- [Terviserajad.ee](https://terviserajad.ee)
- [Visit Estonia](https://visitestonia.com)
