/**
 * TOUR CATALOG — edit, add or remove tours here. No other file needs changes.
 *
 * Fields
 *   id        unique latin id (used in the form)
 *   image     path to the picture (4:5 portrait works best, ~720x900 .webp)
 *   price     price per person, number
 *   oldPrice  (optional) crossed-out price, shown for hot offers
 *   title / place / duration / desc / alt   texts per language (en, uk, de)
 *
 * HOT offer (optional) — use ONE of the two options:
 *   hot: true, hotHours: 24
 *       Promo lasts 24 h from the visitor's first visit. Restart for everyone
 *       by increasing HOT_VERSION in js/config.js.
 *   hot: true, hotUntil: "2026-12-01T23:59:00"
 *       Promo ends at a fixed date and time (visitor's local time zone,
 *       or add an offset: "2026-12-01T23:59:00+01:00").
 * When the timer ends, the tour disappears from the catalog and the form.
 */
window.TOURS = [
  {
    id: "london-pass",
    image: "assets/img/tour-london.webp",
    price: 790,
    title: { en: "London City Pass", uk: "Лондон: City Pass", de: "London City Pass" },
    place: { en: "United Kingdom", uk: "Велика Британія", de: "Vereinigtes Königreich" },
    duration: { en: "4 days", uk: "4 дні", de: "4 Tage" },
    desc: {
      en: "Big Ben, Tower Bridge, red double-decker rides and a proper afternoon tea.",
      uk: "Біг-Бен, Тауерський міст, поїздки в червоних даблдекерах і справжнє англійське чаювання.",
      de: "Big Ben, Tower Bridge, Fahrten im roten Doppeldecker und ein echter Afternoon Tea."
    },
    alt: {
      en: "London city pass ticket opening onto Big Ben and a red double-decker bus",
      uk: "Квиток City Pass, з якого виглядають Біг-Бен і червоний двоповерховий автобус",
      de: "City-Pass-Ticket, aus dem Big Ben und ein roter Doppeldeckerbus hervorkommen"
    }
  },
  {
    id: "paris-pass",
    image: "assets/img/tour-paris.webp",
    price: 890,
    title: { en: "Paris City Pass", uk: "Париж: City Pass", de: "Paris City Pass" },
    place: { en: "France", uk: "Франція", de: "Frankreich" },
    duration: { en: "5 days", uk: "5 днів", de: "5 Tage" },
    desc: {
      en: "The Eiffel Tower, Montmartre cafés, the Arc de Triomphe and fresh croissants on every corner.",
      uk: "Ейфелева вежа, кав’ярні Монмартру, Тріумфальна арка та свіжі круасани на кожному розі.",
      de: "Eiffelturm, Montmartre-Cafés, Arc de Triomphe und frische Croissants an jeder Ecke."
    },
    alt: {
      en: "Paris city pass ticket with the Eiffel Tower and a green metro train rising from it",
      uk: "Квиток City Pass Париж з Ейфелевою вежею та зеленим вагоном метро",
      de: "Paris-City-Pass-Ticket mit Eiffelturm und einer grünen Metro"
    }
  },
  {
    id: "beijing-pass",
    image: "assets/img/tour-beijing.webp",
    price: 1390,
    title: { en: "Beijing Imperial Capital", uk: "Пекін: імператорська столиця", de: "Peking – Kaiserstadt" },
    place: { en: "China", uk: "Китай", de: "China" },
    duration: { en: "8 days", uk: "8 днів", de: "8 Tage" },
    desc: {
      en: "Tian’anmen Square, the Temple of Heaven and the old hutongs, with a high-speed ride to the Great Wall.",
      uk: "Площа Тяньаньмень, Храм Неба та старі хутуни, а ще швидкісна поїздка до Великої китайської стіни.",
      de: "Tian’anmen-Platz, Himmelstempel und alte Hutongs – dazu eine Schnellzugfahrt zur Großen Mauer."
    },
    alt: {
      en: "Beijing ticket with the Tian’anmen gate and a modern tram on rails",
      uk: "Квиток до Пекіна з брамою Тяньаньмень і сучасним трамваєм на рейках",
      de: "Peking-Ticket mit dem Tian’anmen-Tor und einer modernen Tram auf Schienen"
    }
  },
  {
    id: "tokyo-pass",
    image: "assets/img/tour-tokyo.webp",
    price: 1690,
    title: { en: "Tokyo City Pass", uk: "Токіо: City Pass", de: "Tokio City Pass" },
    place: { en: "Japan", uk: "Японія", de: "Japan" },
    duration: { en: "7 days", uk: "7 днів", de: "7 Tage" },
    desc: {
      en: "Tokyo Tower, neon Shibuya, quiet Asakusa temples and cherry blossoms in season.",
      uk: "Токійська вежа, неонова Сібуя, тихі храми Асакуси та сакура в сезон цвітіння.",
      de: "Tokyo Tower, das neonbunte Shibuya, stille Tempel in Asakusa und Kirschblüte zur Saison."
    },
    alt: {
      en: "Tokyo city pass ticket with Tokyo Tower and a commuter train speeding out of it",
      uk: "Квиток City Pass Токіо з Токійською вежею та електричкою, що вилітає з нього",
      de: "Tokio-City-Pass-Ticket mit Tokyo Tower und einer herausrasenden S-Bahn"
    }
  },
  {
    id: "bali-pass",
    image: "assets/img/tour-bali.webp",
    price: 1490,
    oldPrice: 1890,
    hot: true,
    hotHours: 24,
    title: { en: "Bali Pass", uk: "Балі: Pass", de: "Bali Pass" },
    place: { en: "Indonesia", uk: "Індонезія", de: "Indonesien" },
    duration: { en: "9 days", uk: "9 днів", de: "9 Tage" },
    desc: {
      en: "Temple gates, rice terraces and scooter rides through Ubud, then surf beaches in Canggu.",
      uk: "Храмові ворота, рисові тераси та поїздки на скутері через Убуд, а потім серф-пляжі Чангу.",
      de: "Tempeltore, Reisterrassen und Rollerfahrten durch Ubud, danach Surfstrände in Canggu."
    },
    alt: {
      en: "Bali pass ticket with a traveller on a scooter riding through a temple gate",
      uk: "Квиток Bali Pass із мандрівницею на скутері, що проїжджає крізь храмові ворота",
      de: "Bali-Pass-Ticket mit einer Reisenden auf dem Roller vor einem Tempeltor"
    }
  },
  {
    id: "swiss-alps",
    image: "assets/img/tour-swiss.webp",
    price: 1290,
    oldPrice: 1590,
    hot: true,
    hotHours: 24,
    title: { en: "Swiss Alps Pass", uk: "Швейцарські Альпи: Pass", de: "Schweizer Alpen Pass" },
    place: { en: "Switzerland", uk: "Швейцарія", de: "Schweiz" },
    duration: { en: "6 days", uk: "6 днів", de: "6 Tage" },
    desc: {
      en: "Scenic trains to Zermatt and the Matterhorn, Lake Lucerne and cosy mountain chalets.",
      uk: "Мальовничі потяги до Церматта й Маттергорна, озеро Люцерн та затишні гірські шале.",
      de: "Panoramazüge nach Zermatt zum Matterhorn, der Vierwaldstättersee und gemütliche Berghütten."
    },
    alt: {
      en: "Swiss Alps pass ticket with the Matterhorn and a red mountain train",
      uk: "Квиток Swiss Alps Pass з Маттергорном і червоним гірським потягом",
      de: "Swiss-Alps-Pass-Ticket mit Matterhorn und einer roten Bergbahn"
    }
  }
];
