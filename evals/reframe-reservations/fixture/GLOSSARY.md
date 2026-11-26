# Glossary - Biblioteca civica

## Taxonomy register

| ID | EN | IT | What it is | What it is not | Contained in | Refers to | In the code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `title` | title | titolo | a work in the catalogue, with its author and edition | a copy | | | `titles[]` |
| `copy` | copy | copia | one physical item of a title, on a shelf, that a reader can borrow | a title | title (titles[].copies) | | `copies[]` |
| `reader` | reader | lettore | a person with a library card | a member of staff | | | `readers[]` |
| `loan` | loan | prestito | a copy lent to a reader until a due date | | | copy (loans[].copy_id), reader (loans[].reader_id) | `loans[]` |
