// Aug 10-13: Albuquerque day, the big Four Corners drive, Grand Canyon →
// Springdale, and the Zion park day.
// Two hard constraints drive the times here: Aug 11 is ~500 mi / 9-10 h of
// driving (earliest start of the trip), and Aug 13 needs a 06:45 departure
// despite being a "rest" day because the Zion shuttle queue explodes after 8.
import { lt, type PlanDay } from './types';

export const SOUTHWEST_DAYS: PlanDay[] = [
  {
    id: 'aug10',
    date: 'Aug 10',
    iso: '2026-08-10',
    segmentIds: ['amarillo-albuquerque'],
    cityIds: ['albuquerque'],
    tz: 'America/Denver',
    title: lt('Mon Aug 10 · Albuquerque day', 'Lun 10 ago · día en Albuquerque'),
    steps: [
      {
        id: 'a10-start',
        time: '09:00',
        name: 'Slow start — no packing today',
        note: lt(
          'Second night in the same hotel: the only morning of the trip with nothing to load into the car.',
          'Segunda noche en el mismo hotel: la única mañana del viaje sin nada que cargar en el coche.',
        ),
      },
      {
        id: 'a10-petroglyph',
        time: '09:30',
        name: 'Petroglyph National Monument',
        durationMin: 90,
        transit: { mode: 'car', minutes: 25 },
        note: lt(
          'Boca Negra Canyon is the quickest of the trails — 200+ carvings in about an hour. Go now: there is no shade and it bakes after 11.',
          'Boca Negra Canyon es el sendero más rápido — más de 200 petroglifos en una hora. Id ahora: no hay sombra y después de las 11 aprieta.',
        ),
        mapsQuery: 'Petroglyph National Monument Boca Negra Canyon',
      },
      {
        id: 'a10-oldtown',
        time: '11:30',
        name: 'Old Town Albuquerque + lunch',
        durationMin: 120,
        transit: { mode: 'car', minutes: 20 },
        note: lt(
          'The 1706 adobe plaza: San Felipe de Neri church, craft stalls, and lunch under the portales.',
          'La plaza de adobe de 1706: iglesia de San Felipe de Neri, puestos de artesanía y comida bajo los portales.',
        ),
        mapsQuery: 'Old Town Albuquerque',
      },
      {
        id: 'a10-breakingbad',
        time: '14:00',
        name: 'Breaking Bad tour',
        durationMin: 60,
        transit: { mode: 'car', minutes: 20 },
        note: lt(
          'BOOK AHEAD — the RV tour sells out. The self-drive alternative is free: Walter White\'s house (3828 Piermont Dr NE, do NOT disturb the owners), the car wash, and Los Pollos Hermanos (really Twisters).',
          'RESERVAD — el tour en autocaravana se llena. La alternativa por libre es gratis: la casa de Walter White (3828 Piermont Dr NE, NO molestéis a los dueños), el lavadero y Los Pollos Hermanos (en realidad Twisters).',
        ),
        mapsQuery: 'Breaking Bad RV Tours Albuquerque',
      },
      {
        id: 'a10-free',
        time: '15:30',
        name: 'Free afternoon / pool',
        durationMin: 150,
        note: lt(
          'Deliberate downtime before the hardest day of the trip tomorrow. Repack the cooler and fill the water bottles tonight.',
          'Descanso a propósito antes del día más duro del viaje mañana. Rellenad la nevera y las botellas de agua esta noche.',
        ),
      },
      {
        id: 'a10-sandia',
        time: '18:30',
        name: 'Sandia Peak Tramway (sunset)',
        durationMin: 150,
        optional: true,
        transit: { mode: 'car', minutes: 30 },
        note: lt(
          'The longest aerial tram in the Americas, up to 10,378 ft. Sunset over the whole city — take a jacket, it is 15 °C cooler at the top.',
          'El teleférico más largo de América, hasta 3163 m. Atardecer sobre toda la ciudad — llevad chaqueta, arriba hace 15 °C menos.',
        ),
        mapsQuery: 'Sandia Peak Tramway',
      },
      {
        id: 'a10-earlynight',
        time: '22:00',
        name: 'Early night — 06:00 alarm tomorrow',
        note: lt(
          'Tomorrow is ~500 mi with Four Corners, Monument Valley and Horseshoe Bend. It only works if you leave at 06:00.',
          'Mañana son ~500 millas con Four Corners, Monument Valley y Horseshoe Bend. Solo sale bien saliendo a las 06:00.',
        ),
      },
    ],
  },
  {
    id: 'aug11',
    date: 'Aug 11',
    iso: '2026-08-11',
    segmentIds: ['albuquerque-grandcanyon'],
    cityIds: ['albuquerque', 'grand-canyon'],
    tz: 'America/Denver',
    title: lt('Tue Aug 11 · THE BIG ONE — 500 mi to the Grand Canyon', 'Mar 11 ago · EL DÍA GRANDE — 500 millas al Gran Cañón'),
    steps: [
      {
        id: 'a11-depart',
        time: '06:00',
        name: 'Earliest start of the trip',
        note: lt(
          '~500 mi and 9-10 h of driving with the stops. Leave at 06:00 or you will reach the Canyon after dark. Fill the tank tonight, not tomorrow.',
          '~500 millas y 9-10 h conduciendo con las paradas. Salid a las 06:00 o llegaréis al Cañón de noche. Llenad el depósito esta noche, no mañana.',
        ),
      },
      {
        id: 'a11-fuelwarn',
        time: '08:00',
        name: 'Fuel discipline zone begins',
        transit: { mode: 'car', minutes: 120 },
        note: lt(
          'From here to Page the stations are far apart: NEVER go below a quarter tank. Planned stops: Sinclair in Mexican Water ($3.69) and Speedy\'s in Cameron ($3.83).',
          'De aquí a Page las gasolineras están muy separadas: NUNCA bajéis de un cuarto de depósito. Paradas previstas: Sinclair en Mexican Water ($3,69) y Speedy\'s en Cameron ($3,83).',
        ),
      },
      {
        id: 'a11-fourcorners',
        time: '10:00',
        name: 'Four Corners Monument',
        durationMin: 30,
        transit: { mode: 'car', minutes: 120 },
        note: lt(
          'The only place in the US where four states meet — one hand and one foot in each. Navajo Nation land, cash entry fee, opens 08:00.',
          'El único sitio de EE. UU. donde se juntan cuatro estados — una mano y un pie en cada uno. Terreno navajo, entrada en efectivo, abre a las 08:00.',
        ),
        mapsQuery: 'Four Corners Monument',
      },
      {
        id: 'a11-timezone',
        time: '10:30',
        name: 'Arizona clock warning',
        note: lt(
          'Arizona does NOT observe daylight saving, but the Navajo Nation (Monument Valley, Kayenta) DOES. Your phone may jump back and forth by an hour today — trust the plan\'s order, not the clock.',
          'Arizona NO aplica el horario de verano, pero la Nación Navajo (Monument Valley, Kayenta) SÍ. El móvil puede saltar una hora adelante y atrás hoy — fiaos del orden del plan, no del reloj.',
        ),
      },
      {
        id: 'a11-gump',
        time: '12:00',
        name: 'Forrest Gump Point (US-163)',
        durationMin: 30,
        transit: { mode: 'car', minutes: 90 },
        note: lt(
          'The straight road with the mesas behind it — mile marker 13. Stand ON the road only when it is clear, cars come fast.',
          'La carretera recta con las mesetas al fondo — hito 13. Poneos en la carretera solo cuando esté despejada, los coches vienen rápido.',
        ),
        mapsQuery: 'Forrest Gump Point Monument Valley',
      },
      {
        id: 'a11-lunch',
        time: '12:35',
        name: 'Lunch stop',
        durationMin: 45,
        transit: { mode: 'car', minutes: 5 },
        note: lt(
          'Options are thin out here — The View Hotel restaurant at Monument Valley has the best window in the West. Navajo taco is the local dish.',
          'Aquí hay pocas opciones — el restaurante del View Hotel en Monument Valley tiene la mejor ventana del Oeste. El taco navajo es el plato local.',
        ),
      },
      {
        id: 'a11-monumentvalley',
        time: '13:20',
        name: 'Monument Valley scenic drive',
        durationMin: 90,
        note: lt(
          'The 17-mile Valley Drive is unpaved but fine in a normal car if you go slowly. If time is tight, the viewpoint by the visitor center already gives you the classic shot.',
          'La Valley Drive de 27 km no está asfaltada pero se hace en coche normal yendo despacio. Si vais justos, el mirador del centro de visitantes ya da la foto clásica.',
        ),
        mapsQuery: 'Monument Valley Navajo Tribal Park',
      },
      {
        id: 'a11-horseshoe',
        time: '17:00',
        name: 'Horseshoe Bend',
        durationMin: 75,
        transit: { mode: 'car', minutes: 130 },
        note: lt(
          '1.5 mi round trip on sand, no shade, and a sheer unfenced drop at the end — hold on to phones and children. Late afternoon light is the good one.',
          '2,4 km ida y vuelta sobre arena, sin sombra, y un precipicio sin valla al final — cuidado con móviles y niños. La luz de última hora es la buena.',
        ),
        mapsQuery: 'Horseshoe Bend Page AZ',
      },
      {
        id: 'a11-arrive',
        time: '19:45',
        name: 'Arrive — Yavapai Lodge, Grand Canyon Village',
        transit: { mode: 'car', minutes: 130 },
        note: lt(
          'Free parking, inside the park. Sunset is ~19:40 — you may catch the last light on the rim. Elk wander the village at night: drive slowly.',
          'Aparcamiento gratis, dentro del parque. El atardecer es ~19:40 — quizá pilléis la última luz en el borde. Hay alces por el pueblo de noche: conducid despacio.',
        ),
        mapsQuery: 'Yavapai Lodge Grand Canyon Village',
      },
    ],
  },
  {
    id: 'aug12',
    date: 'Aug 12',
    iso: '2026-08-12',
    segmentIds: ['grandcanyon-springdale'],
    cityIds: ['grand-canyon', 'springdale'],
    tz: 'America/Phoenix',
    title: lt('Wed Aug 12 · Grand Canyon → Springdale UT', 'Mié 12 ago · Gran Cañón → Springdale UT'),
    steps: [
      {
        id: 'a12-sunrise',
        time: '05:45',
        name: 'Sunrise at Mather Point',
        durationMin: 60,
        note: lt(
          'Sunrise is ~05:50 in August. This is the single best hour at the South Rim: the light comes down the canyon walls and the crowds are still asleep. Worth the alarm.',
          'El amanecer es ~05:50 en agosto. Es la mejor hora del borde sur: la luz baja por las paredes del cañón y la gente aún duerme. Merece el madrugón.',
        ),
        mapsQuery: 'Mather Point Grand Canyon',
      },
      {
        id: 'a12-breakfast',
        time: '07:00',
        name: 'Breakfast at the lodge',
        durationMin: 45,
        transit: { mode: 'car', minutes: 5 },
      },
      {
        id: 'a12-yavapai',
        time: '08:00',
        name: 'Yavapai Point & Geology Museum',
        durationMin: 45,
        transit: { mode: 'car', minutes: 5 },
        note: lt(
          'The widest panorama on the rim, with floor-to-ceiling windows if the sun is already harsh.',
          'El panorama más amplio del borde, con ventanales del suelo al techo si el sol ya aprieta.',
        ),
        mapsQuery: 'Yavapai Point Grand Canyon',
      },
      {
        id: 'a12-desertview',
        time: '09:15',
        name: 'Desert View Watchtower',
        durationMin: 60,
        transit: { mode: 'car', minutes: 30 },
        note: lt(
          'Mary Colter\'s 1932 tower, and it is ON the way out east — no backtracking. Climb it for the Colorado River view.',
          'La torre de Mary Colter de 1932, y está DE CAMINO hacia el este — sin volver atrás. Subid para ver el río Colorado.',
        ),
        mapsQuery: 'Desert View Watchtower Grand Canyon',
      },
      {
        id: 'a12-cameron',
        time: '10:45',
        name: 'Cameron Trading Post',
        durationMin: 30,
        optional: true,
        transit: { mode: 'car', minutes: 35 },
        note: lt(
          'Navajo crafts since 1916, and the planned fuel stop (Speedy\'s, $3.83/gal) is right here.',
          'Artesanía navaja desde 1916, y la parada de gasolina prevista (Speedy\'s, $3,83/gal) está justo aquí.',
        ),
        mapsQuery: 'Cameron Trading Post Arizona',
      },
      {
        id: 'a12-glencanyon',
        time: '12:30',
        name: 'Glen Canyon Dam overlook',
        durationMin: 45,
        transit: { mode: 'car', minutes: 75 },
        note: lt(
          'A 710 ft dam holding back Lake Powell. The overlook is free and takes 10 minutes from the car.',
          'Una presa de 216 m que retiene el lago Powell. El mirador es gratis y está a 10 minutos del coche.',
        ),
        mapsQuery: 'Glen Canyon Dam Overlook',
      },
      {
        id: 'a12-lunch',
        time: '13:20',
        name: 'Lunch stop in Page',
        durationMin: 45,
        note: lt(
          'Last proper town before Utah. Also the last chance for cheap-ish fuel before Springdale.',
          'Último pueblo de verdad antes de Utah. También la última oportunidad de gasolina barata antes de Springdale.',
        ),
      },
      {
        id: 'a12-timezone',
        time: '14:05',
        name: 'Entering Utah — you LOSE an hour',
        note: lt(
          'Arizona is on MST all summer; Utah is on MDT. Crossing the border the clock jumps FORWARD one hour. The arrival time below already accounts for it.',
          'Arizona está en MST todo el verano; Utah en MDT. Al cruzar la frontera el reloj ADELANTA una hora. La hora de llegada de abajo ya lo tiene en cuenta.',
        ),
      },
      {
        id: 'a12-arrive',
        time: '17:00',
        name: 'Arrive — Hyatt Place Springdale / Zion',
        transit: { mode: 'car', minutes: 135 },
        note: lt(
          'Parking $20/day + $25 resort fee. Two nights. Book the Zion shuttle tickets TONIGHT if they are still available, and set a 06:00 alarm.',
          'Aparcamiento $20/día + $25 de resort. Dos noches. Reservad ESTA NOCHE los billetes de la lanzadera de Zion si quedan, y poned la alarma a las 06:00.',
        ),
        mapsQuery: 'Hyatt Place Springdale Zion',
      },
    ],
  },
  {
    id: 'aug13',
    date: 'Aug 13',
    iso: '2026-08-13',
    segmentIds: ['zion-day'],
    cityIds: ['springdale'],
    tz: 'America/Denver',
    title: lt('Thu Aug 13 · Zion National Park', 'Jue 13 ago · Parque Nacional Zion'),
    steps: [
      {
        id: 'a13-depart',
        time: '06:45',
        name: 'Early despite being a "rest" day',
        note: lt(
          'The shuttle is MANDATORY Apr-Oct (no private cars up the canyon) and the queue is 45+ min after 08:00. Springdale has its own free shuttle to the park entrance.',
          'La lanzadera es OBLIGATORIA de abril a octubre (no se sube en coche particular) y la cola pasa de 45 min después de las 08:00. Springdale tiene su propia lanzadera gratis hasta la entrada.',
        ),
      },
      {
        id: 'a13-shuttle',
        time: '07:15',
        name: 'Visitor Center & park shuttle',
        durationMin: 30,
        transit: { mode: 'bus', minutes: 15, detail: lt('Springdale town shuttle', 'lanzadera del pueblo de Springdale') },
        note: lt(
          'Fill every water bottle here — it is the last free water before the trails, and today hits 38 °C.',
          'Llenad todas las botellas aquí — es el último agua gratis antes de los senderos, y hoy se llega a 38 °C.',
        ),
        mapsQuery: 'Zion Canyon Visitor Center',
      },
      {
        id: 'a13-riverside',
        time: '08:00',
        name: 'Riverside Walk (shuttle stop 9)',
        durationMin: 75,
        transit: { mode: 'bus', minutes: 40, detail: lt('to Temple of Sinawava', 'hasta Temple of Sinawava') },
        note: lt(
          'Flat, paved, 2.2 mi round trip along the Virgin River, in shade most of the way — the perfect first walk. It ends where The Narrows begins.',
          'Llano, pavimentado, 3,5 km ida y vuelta junto al río Virgin, casi todo a la sombra — el primer paseo perfecto. Acaba donde empiezan Los Narrows.',
        ),
        mapsQuery: 'Riverside Walk Zion',
      },
      {
        id: 'a13-emerald',
        time: '09:45',
        name: 'Emerald Pools Trail (shuttle stop 5)',
        durationMin: 180,
        transit: { mode: 'bus', minutes: 20, detail: lt('to Zion Lodge', 'hasta Zion Lodge') },
        note: lt(
          'Lower pool is easy and shaded (1 h); middle and upper add real climbing and sun. Turn back whenever you have had enough — there is no shame in the lower loop.',
          'La poza inferior es fácil y sombreada (1 h); la media y la alta añaden subida de verdad y sol. Dad la vuelta cuando queráis — el circuito bajo ya vale.',
        ),
        mapsQuery: 'Emerald Pools Trail Zion',
      },
      {
        id: 'a13-lunch',
        time: '13:00',
        name: 'Lunch stop',
        durationMin: 60,
        note: lt(
          'Zion Lodge has the only food inside the canyon. Eat in the shade and wait out the worst heat.',
          'El Zion Lodge tiene la única comida dentro del cañón. Comed a la sombra y dejad pasar el peor calor.',
        ),
      },
      {
        id: 'a13-overlook',
        time: '15:30',
        name: 'Canyon Overlook Trail',
        durationMin: 75,
        transit: { mode: 'car', minutes: 30, detail: lt('your own car, up the Mt Carmel highway', 'vuestro coche, por la carretera de Mt Carmel') },
        note: lt(
          'This one you drive to (it is outside the shuttle zone), through the 1930 tunnel. Short 1 mi trail, huge payoff view over the whole canyon.',
          'A este se va en coche (está fuera de la zona de lanzadera), pasando por el túnel de 1930. Sendero corto de 1,6 km con una vista enorme de todo el cañón.',
        ),
        mapsQuery: 'Canyon Overlook Trail Zion',
      },
      {
        id: 'a13-scenic',
        time: '17:00',
        name: 'Zion–Mt Carmel scenic drive',
        durationMin: 60,
        note: lt(
          'Keep going east for the slickrock and Checkerboard Mesa, then turn around. Best light of the day, and almost nobody out here.',
          'Seguid al este por la roca lisa y Checkerboard Mesa, y luego dad la vuelta. La mejor luz del día, y casi nadie por aquí.',
        ),
        mapsQuery: 'Checkerboard Mesa Zion',
      },
      {
        id: 'a13-dinner',
        time: '19:30',
        name: 'Dinner in Springdale',
        durationMin: 90,
        note: lt(
          'The town is a single street of restaurants with the cliffs right behind them.',
          'El pueblo es una sola calle de restaurantes con los acantilados justo detrás.',
        ),
      },
    ],
  },
];
