// career-hub — CV sobre EN
// Anglophone single-column variant of sobre-fr.

#let accent = rgb("#c4006d")

#set page(paper: "a4", margin: (x: 1.6cm, top: 1.4cm, bottom: 1.4cm))
#set text(font: ("Inter", "Helvetica", "Arial"), size: 10pt, lang: "en")
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

#align(center)[
  #text(size: 22pt, weight: 700)[#PLACEHOLDER_NAME#]
  #v(2pt)
  #text(size: 10pt, fill: luma(80))[
    #PLACEHOLDER_TITLE#
  ]
  #v(2pt)
  #text(size: 9pt, fill: luma(100))[
    #PLACEHOLDER_LOCATION# · #PLACEHOLDER_EMAIL# · #PLACEHOLDER_PHONE#
  ]
]

#v(8pt)

= Profile

#PLACEHOLDER_PITCH#

= Experience

#PLACEHOLDER_EXPERIENCES#

= Education

#PLACEHOLDER_EDUCATION#

= Technical skills

#PLACEHOLDER_SKILLS#

= Languages

#PLACEHOLDER_LANGUAGES#

= Interests

#PLACEHOLDER_INTERESTS#
