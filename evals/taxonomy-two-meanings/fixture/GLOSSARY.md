# Glossary - Biblioteca civica

The words of the circulation tool of the town library and of the admin of its public site. The
interface is in Italian and English; the code and the data are in English.

## Taxonomy register

| ID | EN | IT | What it is | What it is not | Contained in | Refers to | In the code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `title` | title | titolo | a work in the catalogue, with its author and edition | a page heading of the site | | | `data/titles.json` `titles[]` |
| `copy` | copy | copia | one physical item of a title, on a shelf, that a reader can borrow | a duplicate record | title (data/titles.json copies[]) | | `copies[]` |
| `record-duplicate` | duplicate | copia | a catalogue record that describes the same title as another one and waits to be merged into it | a copy | title (data/titles.json duplicates[]) | title (data/titles.json duplicates[].of) | `duplicates[]` |
| `reader` | reader | lettore | a person with a library card | a member of staff | | | `data/readers.json` `readers[]` |
| `loan` | loan | prestito | a copy lent to a reader until a due date | | | copy (data/loans.json copy_id), reader (data/loans.json reader_id) | `data/loans.json` `loans[]` |
| `page-heading` | page title | titolo | the heading of a page of the library's public site | a title of the catalogue | | | `data/pages.json` `pages[].heading` |
