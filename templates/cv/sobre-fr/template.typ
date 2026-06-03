// career-hub — CV sobre FR
// Mono-colonne, ATS-friendly, accent magenta #c4006d.
//
// Variables exposées par `meta.yaml` :
//   - accent_color (color)   défaut #c4006d
//   - show_photo (bool)      défaut false
//
// Le contenu réel est injecté par le générateur LLM en remplaçant les
// placeholders #PLACEHOLDER_*#. Ce fichier sert de point de référence pour le
// LLM ("calque" stylistique).

#let accent = rgb("#c4006d")

#set page(
  paper: "a4",
  margin: (x: 1.6cm, top: 1.4cm, bottom: 1.4cm),
)

#set text(
  font: ("Inter", "Helvetica", "Arial"),
  size: 10pt,
  lang: "fr",
  region: "FR",
)

#set par(justify: false, leading: 0.55em)

#show heading.where(level: 1): it => [
  #block(spacing: 0.4em)[
    #text(size: 11pt, weight: 700, fill: accent, tracking: 0.04em)[
      #upper(it.body)
    ]
    #line(length: 100%, stroke: 0.7pt + accent)
  ]
]

#show heading.where(level: 2): it => block(spacing: 0.2em)[
  #text(size: 10.5pt, weight: 700)[#it.body]
]

#let role-line(role, company, location, period) = block(spacing: 0.5em)[
  #text(weight: 600)[#role] · #text(fill: accent, weight: 600)[#company]
  #h(1fr)
  #text(size: 9pt, fill: luma(80))[#period]
  \
  #text(size: 9pt, fill: luma(100))[#location]
]

#let bullet(content) = list(marker: "•", indent: 0.4em, content)

// -----------------------------------------------------------------
// Identité (le générateur remplit ces lignes)
// -----------------------------------------------------------------
#align(center)[
  #text(size: 22pt, weight: 700)[#PLACEHOLDER_NAME#]
  #v(2pt)
  #text(size: 10pt, fill: luma(80))[
    #PLACEHOLDER_TITLE#
  ]
  #v(2pt)
  #text(size: 9pt, fill: luma(100))[
    #PLACEHOLDER_LOCATION# · #PLACEHOLDER_EMAIL# · #PLACEHOLDER_PHONE#
    #linebreak()
    #link("https://" + "#PLACEHOLDER_PORTFOLIO_HOST#")[#PLACEHOLDER_PORTFOLIO#] ·
    #link("https://" + "#PLACEHOLDER_LINKEDIN_HOST#")[#PLACEHOLDER_LINKEDIN#] ·
    #link("https://" + "#PLACEHOLDER_GITHUB_HOST#")[#PLACEHOLDER_GITHUB#]
  ]
]

#v(8pt)

= Profil

#PLACEHOLDER_PITCH#

= Expériences professionnelles

#PLACEHOLDER_EXPERIENCES#

= Formation

#PLACEHOLDER_EDUCATION#

= Compétences techniques

#PLACEHOLDER_SKILLS#

= Langues

#PLACEHOLDER_LANGUAGES#

= Centres d'intérêt

#PLACEHOLDER_INTERESTS#
