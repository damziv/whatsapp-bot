// lib/legal.ts
// Plain-language legal copy, bilingual. Not legal advice — review before relying on it.
// Refers to the app name "QRevent" (no registered company yet); contact: info@qrevent.pro.

export type LegalSection = { h: string; p: string[] }
export type LegalDocument = {
  title: string
  description: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export function getDoc(docs: Record<string, LegalDocument>, locale: string): LegalDocument {
  return docs[locale] ?? docs.en
}

export const privacy: Record<string, LegalDocument> = {
  en: {
    title: 'Privacy Policy',
    description: 'How QRevent collects, uses, and protects photos and personal data.',
    updated: '23 June 2026',
    intro:
      'This Privacy Policy explains how QRevent ("QRevent", "we", "us") handles personal data when you use our service. QRevent lets photographers collect event photos from guests over WhatsApp. For any question, contact us at info@qrevent.pro.',
    sections: [
      {
        h: 'Who we are',
        p: [
          'QRevent is an event photo-collection service. We do not currently operate as a registered company; the service is run by an individual operator who can be reached at info@qrevent.pro. Use the same address for any data-protection request.',
        ],
      },
      {
        h: 'What data we collect',
        p: [
          'Photographer accounts: your name and email address, used to create and manage your account.',
          'Event guests: when a guest sends photos or videos through WhatsApp, we receive their WhatsApp phone number and the media they send.',
          'Couples (event owners): a PIN we generate so you can manage your gallery — we do not require an account from you.',
          'Technical data: basic logs (such as IP address and timestamps) created by our hosting providers for security and reliability.',
        ],
      },
      {
        h: 'How we use your data',
        p: [
          'To provide the service — collecting guest photos into a private gallery and making them available to the couple.',
          'To create and manage photographer accounts and send account-related emails.',
          'To keep the service secure and working.',
        ],
      },
      {
        h: 'WhatsApp',
        p: [
          'Guests reach us by messaging our WhatsApp number. Those messages are delivered through WhatsApp, operated by Meta and subject to Meta’s own privacy terms. We only receive the messages a guest chooses to send to the album.',
        ],
      },
      {
        h: 'Who we share data with',
        p: [
          'We use trusted providers to run the service: Supabase (photo and database storage), Vercel (hosting), Resend (transactional email), and Meta/WhatsApp (messaging). They process data on our behalf and may store it in the EU and/or the United States.',
          'We do not sell your personal data.',
        ],
      },
      {
        h: 'How long we keep photos',
        p: [
          'Photos and videos uploaded to an album are automatically deleted two months after they are uploaded.',
          'When the couple downloads the full gallery, the album’s photos are permanently deleted 24 hours later.',
          'Photographer account details are kept until the account is closed.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'If you are in the EU/EEA, you have the right to access, correct, or delete your personal data, and to object to or restrict its processing.',
          'Guests can ask us to remove a photo they uploaded. Couples and photographers can delete photos directly in their gallery.',
          'To exercise any of these rights, contact info@qrevent.pro.',
        ],
      },
      {
        h: 'Cookies',
        p: [
          'We use a small number of cookies only to remember your language preference and to keep you signed in to the portal. We do not use advertising or tracking cookies.',
        ],
      },
      {
        h: 'Children',
        p: ['QRevent is intended for photographers and their clients. It is not directed at children.'],
      },
      {
        h: 'Changes to this policy',
        p: ['We may update this Privacy Policy from time to time. The date at the top shows when it was last changed.'],
      },
      {
        h: 'Contact',
        p: ['For any privacy question or request, email info@qrevent.pro.'],
      },
    ],
  },
  hr: {
    title: 'Pravila privatnosti',
    description: 'Kako QRevent prikuplja, koristi i štiti fotografije i osobne podatke.',
    updated: '23. lipnja 2026.',
    intro:
      'Ova Pravila privatnosti objašnjavaju kako QRevent ("QRevent", "mi", "nas") postupa s osobnim podacima kada koristite našu uslugu. QRevent omogućuje fotografima prikupljanje fotografija s događaja od gostiju putem WhatsAppa. Za sva pitanja kontaktirajte nas na info@qrevent.pro.',
    sections: [
      {
        h: 'Tko smo mi',
        p: [
          'QRevent je usluga prikupljanja fotografija s događaja. Trenutačno ne poslujemo kao registrirana tvrtka; uslugu vodi pojedinac dostupan na info@qrevent.pro. Istu adresu koristite za sve zahtjeve vezane uz zaštitu podataka.',
        ],
      },
      {
        h: 'Koje podatke prikupljamo',
        p: [
          'Računi fotografa: vaše ime i e-mail adresa, koji se koriste za izradu i upravljanje računom.',
          'Gosti na događaju: kada gost pošalje fotografije ili videe putem WhatsAppa, primamo njegov WhatsApp broj telefona i sadržaj koji pošalje.',
          'Mladenci (vlasnici događaja): PIN koji generiramo kako biste mogli upravljati svojom galerijom — od vas ne tražimo račun.',
          'Tehnički podaci: osnovni zapisi (poput IP adrese i vremenskih oznaka) koje naši pružatelji usluga hostinga stvaraju radi sigurnosti i pouzdanosti.',
        ],
      },
      {
        h: 'Kako koristimo vaše podatke',
        p: [
          'Za pružanje usluge — prikupljanje fotografija gostiju u privatnu galeriju i njihovo stavljanje na raspolaganje paru.',
          'Za izradu i upravljanje računima fotografa te slanje e-mailova vezanih uz račun.',
          'Za održavanje sigurnosti i ispravnog rada usluge.',
        ],
      },
      {
        h: 'WhatsApp',
        p: [
          'Gosti nas kontaktiraju slanjem poruke na naš WhatsApp broj. Te se poruke isporučuju putem WhatsAppa, kojim upravlja Meta i podliježu Metinim pravilima privatnosti. Primamo samo poruke koje gost odabere poslati u album.',
        ],
      },
      {
        h: 'S kim dijelimo podatke',
        p: [
          'Za rad usluge koristimo pouzdane pružatelje: Supabase (pohrana fotografija i baze podataka), Vercel (hosting), Resend (transakcijski e-mail) i Meta/WhatsApp (poruke). Oni obrađuju podatke u naše ime i mogu ih pohraniti u EU i/ili Sjedinjenim Državama.',
          'Ne prodajemo vaše osobne podatke.',
        ],
      },
      {
        h: 'Koliko dugo čuvamo fotografije',
        p: [
          'Fotografije i videi učitani u album automatski se brišu dva mjeseca nakon učitavanja.',
          'Kada par preuzme cijelu galeriju, fotografije albuma trajno se brišu 24 sata kasnije.',
          'Podaci o računu fotografa čuvaju se do zatvaranja računa.',
        ],
      },
      {
        h: 'Vaša prava',
        p: [
          'Ako se nalazite u EU/EEA, imate pravo na pristup, ispravak ili brisanje svojih osobnih podataka te na prigovor ili ograničenje njihove obrade.',
          'Gosti mogu zatražiti uklanjanje fotografije koju su učitali. Mladenci i fotografi mogu brisati fotografije izravno u galeriji.',
          'Za ostvarivanje bilo kojeg od ovih prava kontaktirajte info@qrevent.pro.',
        ],
      },
      {
        h: 'Kolačići',
        p: [
          'Koristimo mali broj kolačića samo za pamćenje vaše jezične postavke i održavanje prijave u portal. Ne koristimo oglašivačke kolačiće ni kolačiće za praćenje.',
        ],
      },
      {
        h: 'Djeca',
        p: ['QRevent je namijenjen fotografima i njihovim klijentima. Nije usmjeren na djecu.'],
      },
      {
        h: 'Izmjene ovih pravila',
        p: ['Ova Pravila privatnosti možemo povremeno ažurirati. Datum na vrhu pokazuje kada su zadnji put izmijenjena.'],
      },
      {
        h: 'Kontakt',
        p: ['Za sva pitanja ili zahtjeve o privatnosti pišite na info@qrevent.pro.'],
      },
    ],
  },
  de: {
    title: 'Datenschutzerklärung',
    description: 'Wie QRevent Fotos und personenbezogene Daten erhebt, nutzt und schützt.',
    updated: '23. Juni 2026',
    intro:
      'Diese Datenschutzerklärung erläutert, wie QRevent ("QRevent", "wir", "uns") mit personenbezogenen Daten umgeht, wenn Sie unseren Dienst nutzen. Mit QRevent sammeln Fotografen Event-Fotos von Gästen über WhatsApp. Bei Fragen kontaktieren Sie uns unter info@qrevent.pro.',
    sections: [
      {
        h: 'Wer wir sind',
        p: [
          'QRevent ist ein Dienst zur Sammlung von Event-Fotos. Wir betreiben derzeit kein eingetragenes Unternehmen; der Dienst wird von einer Einzelperson betrieben, die unter info@qrevent.pro erreichbar ist. Nutzen Sie dieselbe Adresse für alle Datenschutzanfragen.',
        ],
      },
      {
        h: 'Welche Daten wir erheben',
        p: [
          'Fotografenkonten: Ihr Name und Ihre E-Mail-Adresse, zum Erstellen und Verwalten Ihres Kontos.',
          'Event-Gäste: Wenn ein Gast Fotos oder Videos über WhatsApp sendet, erhalten wir seine WhatsApp-Telefonnummer und die gesendeten Medien.',
          'Paare (Event-Eigentümer): eine PIN, die wir generieren, damit Sie Ihre Galerie verwalten können — wir verlangen kein Konto von Ihnen.',
          'Technische Daten: grundlegende Protokolle (wie IP-Adresse und Zeitstempel), die unsere Hosting-Anbieter aus Sicherheits- und Zuverlässigkeitsgründen erstellen.',
        ],
      },
      {
        h: 'Wie wir Ihre Daten nutzen',
        p: [
          'Zur Bereitstellung des Dienstes — Sammeln von Gästefotos in einer privaten Galerie und deren Bereitstellung für das Paar.',
          'Zum Erstellen und Verwalten von Fotografenkonten und zum Versand kontobezogener E-Mails.',
          'Um den Dienst sicher und funktionsfähig zu halten.',
        ],
      },
      {
        h: 'WhatsApp',
        p: [
          'Gäste erreichen uns, indem sie unsere WhatsApp-Nummer anschreiben. Diese Nachrichten werden über WhatsApp zugestellt, das von Meta betrieben wird und dessen eigenen Datenschutzbestimmungen unterliegt. Wir erhalten nur die Nachrichten, die ein Gast an das Album sendet.',
        ],
      },
      {
        h: 'Mit wem wir Daten teilen',
        p: [
          'Für den Betrieb des Dienstes nutzen wir vertrauenswürdige Anbieter: Supabase (Foto- und Datenbankspeicher), Vercel (Hosting), Resend (transaktionale E-Mails) und Meta/WhatsApp (Nachrichten). Sie verarbeiten Daten in unserem Auftrag und können sie in der EU und/oder den USA speichern.',
          'Wir verkaufen Ihre personenbezogenen Daten nicht.',
        ],
      },
      {
        h: 'Wie lange wir Fotos aufbewahren',
        p: [
          'In ein Album hochgeladene Fotos und Videos werden zwei Monate nach dem Hochladen automatisch gelöscht.',
          'Wenn das Paar die vollständige Galerie herunterlädt, werden die Fotos des Albums 24 Stunden später dauerhaft gelöscht.',
          'Kontodaten von Fotografen werden bis zur Schließung des Kontos aufbewahrt.',
        ],
      },
      {
        h: 'Ihre Rechte',
        p: [
          'Wenn Sie sich in der EU/im EWR befinden, haben Sie das Recht auf Auskunft, Berichtigung oder Löschung Ihrer personenbezogenen Daten sowie auf Widerspruch gegen oder Einschränkung ihrer Verarbeitung.',
          'Gäste können uns bitten, ein von ihnen hochgeladenes Foto zu entfernen. Paare und Fotografen können Fotos direkt in ihrer Galerie löschen.',
          'Um eines dieser Rechte auszuüben, kontaktieren Sie info@qrevent.pro.',
        ],
      },
      {
        h: 'Cookies',
        p: [
          'Wir verwenden nur wenige Cookies, ausschließlich um Ihre Spracheinstellung zu speichern und Sie im Portal angemeldet zu halten. Wir verwenden keine Werbe- oder Tracking-Cookies.',
        ],
      },
      {
        h: 'Kinder',
        p: ['QRevent richtet sich an Fotografen und ihre Kunden. Es ist nicht für Kinder bestimmt.'],
      },
      {
        h: 'Änderungen dieser Erklärung',
        p: ['Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Das Datum oben zeigt, wann sie zuletzt geändert wurde.'],
      },
      {
        h: 'Kontakt',
        p: ['Bei Fragen oder Anliegen zum Datenschutz schreiben Sie an info@qrevent.pro.'],
      },
    ],
  },
}

export const terms: Record<string, LegalDocument> = {
  en: {
    title: 'Terms & Conditions',
    description: 'The terms for using QRevent’s event photo-collection service.',
    updated: '23 June 2026',
    intro:
      'These Terms & Conditions govern your use of QRevent. By using the service you agree to these terms. If you do not agree, please do not use QRevent. You can contact us at info@qrevent.pro.',
    sections: [
      {
        h: 'The service',
        p: [
          'QRevent lets photographers create a QR code for an event. Guests scan it, send photos and videos over WhatsApp, and those land in a private gallery the photographer shares with the couple.',
        ],
      },
      {
        h: 'Accounts',
        p: [
          'Photographer accounts are created by request and require our approval. You are responsible for keeping your account and any PINs you share secure.',
          'You must provide accurate information when requesting access.',
        ],
      },
      {
        h: 'Acceptable use',
        p: [
          'Only upload or collect content you have the right to use. Do not use QRevent for unlawful, infringing, or offensive content.',
          'The demo album is shared and for testing only — do not use it for real events or private material.',
        ],
      },
      {
        h: 'Your content',
        p: [
          'Photographers, couples, and guests keep all rights to the photos and videos they create or upload.',
          'You grant QRevent permission to store and process that content only as needed to provide the service — for example, to show it in the gallery and let the couple download it.',
        ],
      },
      {
        h: 'Photo retention and deletion',
        p: [
          'Photos are automatically deleted two months after upload, and 24 hours after the couple downloads the full gallery.',
          'QRevent is not a backup service. Please keep your own copies of any photos you want to keep.',
        ],
      },
      {
        h: 'Plans and payment',
        p: [
          'Paid plans are described on our Pricing page. Prices are per year and arranged directly with us. We may change prices for future purchases.',
        ],
      },
      {
        h: 'Availability',
        p: [
          'We work to keep QRevent available and reliable, but the service is provided “as is” and we cannot guarantee it will be uninterrupted or error-free.',
        ],
      },
      {
        h: 'Limitation of liability',
        p: [
          'To the maximum extent permitted by law, QRevent is not liable for any lost photos, data, or other indirect damages arising from your use of the service. Always keep your own copies of important photos.',
        ],
      },
      {
        h: 'Changes to these terms',
        p: [
          'We may update these terms from time to time. The date at the top shows when they were last changed. Continued use of QRevent means you accept the updated terms.',
        ],
      },
      {
        h: 'Governing law',
        p: ['These terms are governed by the laws of Croatia and applicable EU law.'],
      },
      {
        h: 'Contact',
        p: ['Questions about these terms? Email info@qrevent.pro.'],
      },
    ],
  },
  hr: {
    title: 'Uvjeti korištenja',
    description: 'Uvjeti korištenja QRevent usluge za prikupljanje fotografija s događaja.',
    updated: '23. lipnja 2026.',
    intro:
      'Ovi Uvjeti korištenja uređuju vaše korištenje QRevent usluge. Korištenjem usluge prihvaćate ove uvjete. Ako se ne slažete, nemojte koristiti QRevent. Možete nas kontaktirati na info@qrevent.pro.',
    sections: [
      {
        h: 'Usluga',
        p: [
          'QRevent omogućuje fotografima izradu QR koda za događaj. Gosti ga skeniraju, šalju fotografije i videe putem WhatsAppa, a oni stižu u privatnu galeriju koju fotograf dijeli s parom.',
        ],
      },
      {
        h: 'Računi',
        p: [
          'Računi fotografa izrađuju se na zahtjev i podliježu našem odobrenju. Odgovorni ste za čuvanje svog računa i svih PIN-ova koje dijelite.',
          'Pri traženju pristupa morate navesti točne podatke.',
        ],
      },
      {
        h: 'Prihvatljivo korištenje',
        p: [
          'Učitavajte ili prikupljajte samo sadržaj na koji imate pravo. Ne koristite QRevent za nezakonit, protupravan ili uvredljiv sadržaj.',
          'Demo album je zajednički i služi samo za testiranje — ne koristite ga za stvarne događaje ili privatni materijal.',
        ],
      },
      {
        h: 'Vaš sadržaj',
        p: [
          'Fotografi, mladenci i gosti zadržavaju sva prava na fotografije i videe koje stvore ili učitaju.',
          'QReventu dajete dopuštenje za pohranu i obradu tog sadržaja samo u mjeri potrebnoj za pružanje usluge — primjerice za prikaz u galeriji i omogućavanje paru da ga preuzme.',
        ],
      },
      {
        h: 'Čuvanje i brisanje fotografija',
        p: [
          'Fotografije se automatski brišu dva mjeseca nakon učitavanja te 24 sata nakon što par preuzme cijelu galeriju.',
          'QRevent nije usluga sigurnosne pohrane. Zadržite vlastite kopije fotografija koje želite sačuvati.',
        ],
      },
      {
        h: 'Planovi i plaćanje',
        p: [
          'Plaćeni planovi opisani su na stranici Cijene. Cijene su godišnje i dogovaraju se izravno s nama. Cijene za buduće kupnje možemo mijenjati.',
        ],
      },
      {
        h: 'Dostupnost',
        p: [
          'Trudimo se da QRevent bude dostupan i pouzdan, no usluga se pruža "kakva jest" i ne možemo jamčiti neprekidan rad bez pogrešaka.',
        ],
      },
      {
        h: 'Ograničenje odgovornosti',
        p: [
          'U najvećoj mjeri dopuštenoj zakonom, QRevent ne odgovara za izgubljene fotografije, podatke ili druge neizravne štete nastale korištenjem usluge. Uvijek zadržite vlastite kopije važnih fotografija.',
        ],
      },
      {
        h: 'Izmjene ovih uvjeta',
        p: [
          'Ove uvjete možemo povremeno ažurirati. Datum na vrhu pokazuje kada su zadnji put izmijenjeni. Nastavak korištenja QRevent usluge znači da prihvaćate ažurirane uvjete.',
        ],
      },
      {
        h: 'Mjerodavno pravo',
        p: ['Ovi uvjeti uređeni su zakonima Republike Hrvatske i mjerodavnim pravom EU-a.'],
      },
      {
        h: 'Kontakt',
        p: ['Pitanja o ovim uvjetima? Pišite na info@qrevent.pro.'],
      },
    ],
  },
  de: {
    title: 'Nutzungsbedingungen',
    description: 'Die Bedingungen für die Nutzung des QRevent-Dienstes zur Event-Fotosammlung.',
    updated: '23. Juni 2026',
    intro:
      'Diese Nutzungsbedingungen regeln Ihre Nutzung von QRevent. Durch die Nutzung des Dienstes stimmen Sie diesen Bedingungen zu. Wenn Sie nicht einverstanden sind, nutzen Sie QRevent bitte nicht. Sie können uns unter info@qrevent.pro kontaktieren.',
    sections: [
      {
        h: 'Der Dienst',
        p: [
          'Mit QRevent erstellen Fotografen einen QR-Code für ein Event. Gäste scannen ihn, senden Fotos und Videos über WhatsApp, und diese landen in einer privaten Galerie, die der Fotograf mit dem Paar teilt.',
        ],
      },
      {
        h: 'Konten',
        p: [
          'Fotografenkonten werden auf Anfrage erstellt und bedürfen unserer Genehmigung. Sie sind dafür verantwortlich, Ihr Konto und alle von Ihnen geteilten PINs sicher zu halten.',
          'Bei der Anfrage müssen Sie korrekte Angaben machen.',
        ],
      },
      {
        h: 'Zulässige Nutzung',
        p: [
          'Laden oder sammeln Sie nur Inhalte, zu deren Nutzung Sie berechtigt sind. Nutzen Sie QRevent nicht für rechtswidrige, rechtsverletzende oder anstößige Inhalte.',
          'Das Demo-Album ist gemeinsam genutzt und dient nur zu Testzwecken — verwenden Sie es nicht für echte Events oder privates Material.',
        ],
      },
      {
        h: 'Ihre Inhalte',
        p: [
          'Fotografen, Paare und Gäste behalten alle Rechte an den Fotos und Videos, die sie erstellen oder hochladen.',
          'Sie gewähren QRevent die Erlaubnis, diese Inhalte nur insoweit zu speichern und zu verarbeiten, wie es zur Bereitstellung des Dienstes erforderlich ist — etwa um sie in der Galerie anzuzeigen und dem Paar das Herunterladen zu ermöglichen.',
        ],
      },
      {
        h: 'Aufbewahrung und Löschung von Fotos',
        p: [
          'Fotos werden zwei Monate nach dem Hochladen automatisch gelöscht sowie 24 Stunden nachdem das Paar die vollständige Galerie heruntergeladen hat.',
          'QRevent ist kein Backup-Dienst. Bitte bewahren Sie eigene Kopien aller Fotos auf, die Sie behalten möchten.',
        ],
      },
      {
        h: 'Pläne und Zahlung',
        p: [
          'Kostenpflichtige Pläne sind auf unserer Preisseite beschrieben. Die Preise gelten pro Jahr und werden direkt mit uns vereinbart. Wir können Preise für zukünftige Käufe ändern.',
        ],
      },
      {
        h: 'Verfügbarkeit',
        p: [
          'Wir bemühen uns, QRevent verfügbar und zuverlässig zu halten, der Dienst wird jedoch "wie besehen" bereitgestellt, und wir können keinen unterbrechungs- oder fehlerfreien Betrieb garantieren.',
        ],
      },
      {
        h: 'Haftungsbeschränkung',
        p: [
          'Im größtmöglichen gesetzlich zulässigen Umfang haftet QRevent nicht für verlorene Fotos, Daten oder sonstige indirekte Schäden, die aus Ihrer Nutzung des Dienstes entstehen. Bewahren Sie stets eigene Kopien wichtiger Fotos auf.',
        ],
      },
      {
        h: 'Änderungen dieser Bedingungen',
        p: [
          'Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Das Datum oben zeigt, wann sie zuletzt geändert wurden. Die fortgesetzte Nutzung von QRevent bedeutet, dass Sie die aktualisierten Bedingungen akzeptieren.',
        ],
      },
      {
        h: 'Anwendbares Recht',
        p: ['Diese Bedingungen unterliegen dem Recht der Republik Kroatien und dem geltenden EU-Recht.'],
      },
      {
        h: 'Kontakt',
        p: ['Fragen zu diesen Bedingungen? Schreiben Sie an info@qrevent.pro.'],
      },
    ],
  },
}
