// Offline chatbot layer (CLAUDE.md section 9, layer 1).
// Pre-generated "extra ideas" per segment, bundled with the app so the
// assistant ALWAYS has an instant answer even with zero signal.
// Keys match Segment.id in tripData.ts.

import type { Lang } from '../i18n';

export const EXTRA_IDEAS: Record<string, Record<Lang, string>> = {
  chicago: {
    en: 'Beyond the list: walk the Riverwalk at golden hour, grab a deep-dish at Lou Malnati\'s or Giordano\'s, see the free Buckingham Fountain show, or catch the view from the Ledge at Willis Tower (paid). Chicago-style hot dog: never ask for ketchup. The Loop\'s elevated "L" trains are an attraction in themselves.',
    es: 'Además de la lista: pasea por el Riverwalk al atardecer, prueba una deep-dish en Lou Malnati\'s o Giordano\'s, mira el espectáculo gratuito de Buckingham Fountain o sube al Ledge de Willis Tower (de pago). Hot dog estilo Chicago: nunca pidas kétchup. El tren elevado "L" del Loop es una atracción en sí mismo.',
  },
  'chicago-stlouis': {
    en: 'Extra stops if you have time: the Gemini Giant in Wilmington (classic muffler man), Route 66 Hall of Fame in Pontiac (free, with murals for photos), Cozy Dog Drive In in Springfield IL (birthplace of the corn dog), and Henry\'s Rabbit Ranch in Staunton. Funks Grove "sirup" farm is a quick quirky stop.',
    es: 'Paradas extra si hay tiempo: el Gemini Giant en Wilmington, el Route 66 Hall of Fame en Pontiac (gratis, con murales para fotos), Cozy Dog Drive In en Springfield IL (cuna del corn dog) y Henry\'s Rabbit Ranch en Staunton. La granja de "sirup" de Funks Grove es una parada curiosa y rápida.',
  },
  'stlouis-springfieldmo': {
    en: 'Extras: Ted Drewes Frozen Custard on old Route 66 in St. Louis (a classic), Meramec Caverns near Stanton (Jesse James hideout, ~1.5h tour), Fanning 66 Outpost giant rocker, and Gary\'s Gay Parita recreated 1930s gas station near Ash Grove. Devil\'s Elbow bridge is a scenic old-road detour.',
    es: 'Extras: Ted Drewes Frozen Custard en la vieja Route 66 en St. Louis, Meramec Caverns cerca de Stanton (escondite de Jesse James, tour de ~1,5 h), la mecedora gigante de Fanning 66 Outpost y la gasolinera años 30 recreada de Gary\'s Gay Parita. El puente de Devil\'s Elbow es un desvío escénico.',
  },
  'springfieldmo-tulsa': {
    en: 'Extras: Route 66 Drive-In theater in Carthage (evening shows), Bonnie & Clyde hideout in Joplin, Coleman Theatre in Miami OK, and the Golden Driller statue in Tulsa. In Tulsa, the Center of the Universe acoustic anomaly is a fun free 10-minute stop, and Buck Atom\'s Cosmic Curios has great souvenirs.',
    es: 'Extras: el autocine Route 66 Drive-In en Carthage, el escondite de Bonnie & Clyde en Joplin, el Coleman Theatre en Miami OK y la estatua Golden Driller en Tulsa. En Tulsa, la anomalía acústica del Center of the Universe es una parada gratis de 10 minutos, y Buck Atom\'s tiene buenos recuerdos.',
  },
  'tulsa-amarillo': {
    en: 'Extras: Arcadia Round Barn (free, next to Pops 66), the Milk Bottle Grocery in OKC, Stafford Air & Space Museum in Weatherford, the National Route 66 Museum in Elk City, and the U-Drop Inn in Shamrock TX (the Art Deco station from "Cars"). Groom\'s giant cross is visible from I-40.',
    es: 'Extras: el granero redondo de Arcadia (gratis, junto a Pops 66), el Milk Bottle Grocery en OKC, el museo Stafford Air & Space en Weatherford, el National Route 66 Museum en Elk City y el U-Drop Inn en Shamrock TX (la gasolinera Art Déco de "Cars"). La cruz gigante de Groom se ve desde la I-40.',
  },
  'amarillo-albuquerque': {
    en: 'Extras: the ghost town of Glenrio on the TX/NM line, Russell\'s Truck Stop free car museum, Tucumcari\'s neon and the Blue Swallow Motel (photo classic), Santa Rosa\'s Blue Hole (crystal-clear swimming spot, bring towels!), and Old Town Albuquerque for green-chile everything. Consider the Sandia Peak Tramway at sunset.',
    es: 'Extras: el pueblo fantasma de Glenrio en la línea TX/NM, el museo de coches gratis de Russell\'s Truck Stop, el neón de Tucumcari y el Blue Swallow Motel, el Blue Hole de Santa Rosa (poza cristalina para nadar, ¡lleva toalla!) y el Old Town de Albuquerque con chile verde en todo. Considera el teleférico de Sandia Peak al atardecer.',
  },
  'albuquerque-grandcanyon': {
    en: 'This is the big desert day — extras only if you\'re on schedule: Shiprock pinnacle views from US-64, Goosenecks State Park overlook near Mexican Hat (10 min detour, epic river bends), and Navajo frybread or a taco at a roadside stand in Kayenta. Fuel discipline beats sightseeing today: never below 1/4 tank.',
    es: 'Es el gran día del desierto — extras solo si vais bien de tiempo: vistas del pináculo de Shiprock desde la US-64, el mirador de Goosenecks State Park cerca de Mexican Hat (desvío de 10 min) y frybread navajo o un taco en un puesto de Kayenta. Hoy manda la gasolina, no el turismo: nunca por debajo de 1/4 de tanque.',
  },
  'grandcanyon-springdale': {
    en: 'Extras: sunrise at Mather Point is worth the alarm; Hopi House and the historic El Tovar lobby on the rim; Cameron Trading Post for Navajo crafts and a fry-bread taco; Horseshoe Bend again at a different light if you missed it; and Lake Powell overlooks near Page. In Kanab, stop for pie at a local diner.',
    es: 'Extras: el amanecer en Mather Point merece el madrugón; Hopi House y el lobby histórico de El Tovar en el borde; Cameron Trading Post para artesanía navaja y un taco de frybread; Horseshoe Bend con otra luz si os lo perdisteis; y los miradores del lago Powell cerca de Page. En Kanab, parad a por un pastel en un diner local.',
  },
  'zion-day': {
    en: 'Extras in and around Zion: the Pa\'rus Trail is flat, paved and dog/bike friendly (good for a recovery stroll); Zion Human History Museum has a good intro film; Springdale itself has great galleries and smoothie shops. If trails are packed, drive the Zion–Mt Carmel highway east side — the slickrock and the long tunnel are spectacular.',
    es: 'Extras en Zion y alrededores: el sendero Pa\'rus es llano y pavimentado (ideal para pasear); el Zion Human History Museum tiene una buena película introductoria; Springdale tiene galerías y batidos. Si los senderos están llenos, conducid la carretera Zion–Mt Carmel hacia el este: la roca lisa y el túnel largo son espectaculares.',
  },
  'springdale-lasvegas': {
    en: 'Extras: the Virgin River Gorge stretch of I-15 is dramatic — no stop needed, just enjoy it. In St. George, the red-rock Pioneer Park has a mini slot canyon. In Vegas at night: the Fremont Street Experience light canopy downtown, the Bellagio Conservatory (free), and the High Roller wheel if you feel like paying. Stay hydrated — it\'s 40°C+.',
    es: 'Extras: el tramo del desfiladero del río Virgin en la I-15 es espectacular — sin parar, solo disfrutarlo. En St. George, Pioneer Park tiene un mini cañón. En Las Vegas de noche: el techo de luces de Fremont Street, el invernadero del Bellagio (gratis) y la noria High Roller si queréis pagar. Hidrataos — hace más de 40 °C.',
  },
  'lasvegas-threerivers': {
    en: 'Extras: Calico Ghost Town near Barstow (touristy but fun), Peggy Sue\'s 50s Diner in Yermo, Elmer\'s Bottle Tree Ranch on old Route 66 near Oro Grande, and the Bakersfield Sound country-music heritage (Buck Owens\' Crystal Palace) if you roll in hungry. Top up water and snacks before the Mojave stretch.',
    es: 'Extras: el pueblo fantasma de Calico cerca de Barstow, el diner años 50 Peggy Sue\'s en Yermo, el Bottle Tree Ranch de Elmer en la vieja Route 66 cerca de Oro Grande, y el legado country del "Bakersfield Sound" (Crystal Palace de Buck Owens) si llegáis con hambre. Cargad agua y snacks antes del Mojave.',
  },
  'threerivers-losangeles': {
    en: 'Extras in Sequoia: Moro Rock staircase (short, epic views), Tunnel Log drive-through, and Crescent Meadow for easy bear spotting. On the way down, Fort Tejon on I-5 is a quick history stop. Reaching LA, time Santa Monica for sunset — the pier sign photo line is shorter in the evening.',
    es: 'Extras en Sequoia: la escalera de Moro Rock (corta, vistas épicas), el Tunnel Log y Crescent Meadow para ver osos con suerte. Bajando, Fort Tejon en la I-5 es una parada histórica rápida. Al llegar a LA, cronometrad Santa Monica para el atardecer — la cola para la foto del cartel es más corta por la tarde.',
  },
  'los-angeles': {
    en: 'Extras: The Last Bookstore downtown, Grand Central Market for lunch, the Petersen Automotive Museum (fitting end to a road trip!), LACMA\'s Urban Light at night, Santa Monica\'s Third Street Promenade, and a Warner Bros. studio tour if you book ahead. For the NBA runs: Lakers store at Crypto.com Arena, then Intuit Dome on the way to LAX.',
    es: 'Extras: The Last Bookstore en el centro, Grand Central Market para comer, el museo Petersen del automóvil (¡final perfecto para un road trip!), las farolas de Urban Light en LACMA de noche, el Third Street Promenade de Santa Monica y el tour de Warner Bros. si reserváis. Para la NBA: tienda de los Lakers en Crypto.com Arena y luego el Intuit Dome camino de LAX.',
  },
};
