# Glossary

Use these terms in every catalog so the UI speaks one language. English is the source; Slovak and Czech are written for native readers, not translated word for word.

| English | Slovak | Czech | Notes |
|---|---|---|---|
| post | príspevok (2–4 príspevky, 5+ príspevkov) | příspěvek (2–4 příspěvky, 5+ příspěvků) | One piece of content, with its variants per destination. |
| channel | kanál | kanál | A connected social account or page. |
| connect / reconnect | pripojiť / znova pripojiť | připojit / znovu připojit | Linking a channel through the network's sign-in. |
| network | sieť | síť | Bluesky, Instagram and the like, as the user sees them. Code calls it a provider. |
| handle | používateľské meno | uživatelské jméno | The account's @name on a network. |
| schedule (verb) | naplánovať | naplánovat | Never "rozvrh"; that is a timetable. |
| scheduled | naplánovaný | naplánovaný | |
| approval | schválenie | schválení | The step before a post can be scheduled. |
| approve | schváliť | schválit | |
| workspace | pracovný priestor | pracovní prostor | Holds channels, posts and members. |
| sign in / sign out | prihlásiť sa / odhlásiť sa | přihlásit se / odhlásit se | |
| password | heslo | heslo | |
| draft | koncept | koncept | A post that is saved but not scheduled. Never "návrh"; that reads as a proposal. |
| publish / publish now | uverejniť / uverejniť hneď | zveřejnit / zveřejnit hned | Sending a post to its channels; "now" means as soon as possible, without a time. |
| alt text | alternatívny text | alternativní text | The image description for people who can't see it. Not "popis", which is the caption. |
| calendar | kalendár | kalendář | The week, month and list views of scheduled posts. |
| drafts | koncepty | koncepty | The list of posts with no scheduled time; plural of "draft". |
| time zone | časové pásmo | časové pásmo | An IANA zone such as Europe/Bratislava; never "zóna". |
| reply | odpoveď | odpověď | A later item of a reply chain, published under the main post. |
| first comment | prvý komentár | první komentář | A comment the channel posts under its own post. |

## Style

- Address the user formally (vy / vykání) in sk and cs.
- Count messages always use plural variants (`one`, `few`, `many`, `other`); never pick a form in code.
- Dates and numbers come from `Intl` or Temporal with the active locale.
