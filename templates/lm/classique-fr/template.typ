// career-hub — Lettre de motivation classique FR

#set page(paper: "a4", margin: (x: 1.8cm, top: 2cm, bottom: 2cm))
#set text(font: ("Inter", "Helvetica", "Arial"), size: 10.5pt, lang: "fr", region: "FR")
#set par(justify: true, leading: 0.65em, first-line-indent: 0pt)

#let accent = rgb("#c4006d")

// En-tête : expéditeur
#PLACEHOLDER_SENDER_NAME#
#linebreak()
#PLACEHOLDER_SENDER_LOCATION#
#linebreak()
#PLACEHOLDER_SENDER_EMAIL#

#v(16pt)

// Destinataire
#PLACEHOLDER_RECIPIENT_NAME#
#linebreak()
#PLACEHOLDER_RECIPIENT_COMPANY#

#v(16pt)

#align(right)[
  #text(fill: luma(80))[Le #PLACEHOLDER_DATE#]
]

#v(8pt)

*Objet :* #PLACEHOLDER_OBJET#

#v(12pt)

#PLACEHOLDER_OPENING#

#v(8pt)

#PLACEHOLDER_FIT_PARAGRAPH#

#v(8pt)

#PLACEHOLDER_MOTIVATION_PARAGRAPH#

#v(12pt)

Bien à vous,

#v(20pt)

#PLACEHOLDER_SENDER_NAME#
