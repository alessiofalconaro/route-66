// Chicago day-by-day walking plan (Aug 3–5), designed around the group's
// constraints: arrival ~15:00 on Aug 3, river cruise booked ~10:00 on Aug 4,
// car pickup the morning of Aug 5 with United Center on the way out of town.
// Like tripData, this file is read-only: user edits live in localStorage
// overrides (lib/planOverrides.ts) and sync across the phones via /plan.

// Localized text: the app UI is EN/ES, so plan notes carry both languages.
// Proper nouns (place names) stay in English, per the project i18n rule.
export interface LText {
  en: string;
  es: string;
}

export interface PlanTransit {
  mode: 'walk' | 'bus' | 'car' | 'taxi';
  minutes: number;
  detail?: LText; // e.g. "bus 151 from Michigan Ave"
}

export interface PlanStep {
  id: string;
  time: string; // "15:00" — suggested start time, not a hard booking
  name: string; // proper noun, stays in English
  durationMin?: number;
  optional?: boolean; // "only if we pass nearby" stops (Starbucks, Nutella)
  transit?: PlanTransit; // how to get HERE from the previous step
  note?: LText;
  mapsQuery?: string; // used with mapsUrl(); coordinates for ambiguous pins
}

export interface PlanDay {
  id: string;
  date: string; // "Aug 3"
  title: LText;
  steps: PlanStep[];
}

// Small helper to keep the literals below short.
const lt = (en: string, es: string): LText => ({ en, es });

export const CHICAGO_PLAN: PlanDay[] = [
  {
    id: 'aug3',
    date: 'Aug 3',
    title: lt('Mon Aug 3 · afternoon & evening', 'Lun 3 ago · tarde y noche'),
    steps: [
      {
        id: 'a3-alice',
        time: '15:00',
        name: 'Alice & Wonder – State',
        durationMin: 30,
        transit: { mode: 'walk', minutes: 6, detail: lt('from the hotel', 'desde el hotel') },
        note: lt(
          'Chicago souvenir & apparel boutique — right by the hotel.',
          'Tienda de recuerdos y ropa de Chicago — al lado del hotel.',
        ),
        mapsQuery: 'Alice and Wonder State Street Chicago',
      },
      {
        id: 'a3-starbucks',
        time: '15:45',
        name: 'Starbucks Reserve Roastery',
        durationMin: 45,
        optional: true,
        transit: { mode: 'walk', minutes: 8 },
        note: lt(
          'Optional — it IS on the way (Michigan Ave): the world’s largest Starbucks, 5 floors.',
          'Opcional — está de camino (Michigan Ave): el Starbucks más grande del mundo, 5 plantas.',
        ),
        mapsQuery: 'Starbucks Reserve Roastery Chicago',
      },
      {
        id: 'a3-magmile',
        time: '16:45',
        name: 'Magnificent Mile stroll',
        durationMin: 45,
        note: lt(
          'Walk Michigan Ave north toward the Water Tower — shops and skyline.',
          'Pasea por Michigan Ave hacia el norte hasta la Water Tower — tiendas y skyline.',
        ),
        mapsQuery: 'Magnificent Mile Chicago',
      },
      {
        id: 'a3-break',
        time: '17:45',
        name: 'Free break',
        durationMin: 80,
        note: lt(
          'Dinner is late (8–9 PM), so take it easy: a drink, Oak Street Beach, or rest at the hotel.',
          'La cena es tarde (20–21 h), así que con calma: algo de beber, Oak Street Beach o descanso en el hotel.',
        ),
      },
      {
        id: 'a3-360',
        time: '19:15',
        name: '360 Chicago (sunset)',
        durationMin: 75,
        transit: { mode: 'walk', minutes: 5 },
        note: lt(
          'Observation deck at 875 N Michigan — sunset is ~8 PM in early August, the best light.',
          'Mirador en 875 N Michigan — el atardecer es ~20:00 a principios de agosto, la mejor luz.',
        ),
        mapsQuery: '360 Chicago Observation Deck',
      },
      {
        id: 'a3-dinner',
        time: '20:45',
        name: 'Dinner in River North',
        durationMin: 90,
        transit: { mode: 'walk', minutes: 10 },
        note: lt(
          'Pick a spot on the go — River North is full of options (deep-dish pizza!).',
          'Elegid sitio sobre la marcha — River North está lleno de opciones (¡pizza deep-dish!).',
        ),
        mapsQuery: 'restaurants River North Chicago',
      },
    ],
  },
  {
    id: 'aug4',
    date: 'Aug 4',
    title: lt('Tue Aug 4 · full day', 'Mar 4 ago · día completo'),
    steps: [
      {
        id: 'a4-cruise',
        time: '09:30',
        name: 'Chicago River Cruise',
        durationMin: 150,
        transit: { mode: 'walk', minutes: 15, detail: lt('from the hotel', 'desde el hotel') },
        note: lt(
          'BOOK AHEAD for ~10:00 (earliest slot). Meeting point Michigan Ave / Wacker — be there 30 min early; the cruise runs ~90 min.',
          'RESERVAD CON ANTELACIÓN para las ~10:00 (primer turno). Punto de encuentro Michigan Ave / Wacker — llegad 30 min antes; el crucero dura ~90 min.',
        ),
        mapsQuery: '41.88921,-87.62442',
      },
      {
        id: 'a4-theatre',
        time: '12:00',
        name: 'The Chicago Theatre',
        durationMin: 15,
        transit: { mode: 'walk', minutes: 5 },
        note: lt(
          'Marquee photo from outside. The inside is only visitable on the guided tour (usually noon, select days — check availability).',
          'Foto del cartel desde fuera. El interior solo se visita con el tour guiado (normalmente a mediodía, días concretos — comprobad disponibilidad).',
        ),
        mapsQuery: 'The Chicago Theatre',
      },
      {
        id: 'a4-lunch',
        time: '12:30',
        name: 'Lunch in the Loop',
        durationMin: 60,
        transit: { mode: 'walk', minutes: 5 },
        note: lt('Choose on the spot.', 'Elegid sobre la marcha.'),
        mapsQuery: 'restaurants the Loop Chicago',
      },
      {
        id: 'a4-millennium',
        time: '13:45',
        name: 'Millennium Park / Cloud Gate',
        durationMin: 45,
        transit: { mode: 'walk', minutes: 10 },
        note: lt('The Bean + Crown Fountain.', 'El Bean + Crown Fountain.'),
        mapsQuery: 'Cloud Gate Millennium Park Chicago',
      },
      {
        id: 'a4-art',
        time: '14:40',
        name: 'Art Institute of Chicago (exterior)',
        durationMin: 15,
        transit: { mode: 'walk', minutes: 4 },
        note: lt(
          'Facade + the bronze lions — no inside visit this trip.',
          'Fachada + los leones de bronce — sin visita interior este viaje.',
        ),
        mapsQuery: 'Art Institute of Chicago',
      },
      {
        id: 'a4-r66-begin',
        time: '15:00',
        name: 'First Route 66 Sign in Illinois',
        durationMin: 10,
        transit: { mode: 'walk', minutes: 3 },
        note: lt('Adams St / Michigan Ave — THE starting-line photo.', 'Adams St / Michigan Ave — LA foto de la línea de salida.'),
        mapsQuery: 'Route 66 Begin sign Adams Street Chicago',
      },
      {
        id: 'a4-r66-end',
        time: '15:15',
        name: 'End Historic Route 66 Sign',
        durationMin: 10,
        transit: { mode: 'walk', minutes: 5 },
        note: lt('Jackson Blvd, one block south.', 'Jackson Blvd, una manzana al sur.'),
        mapsQuery: 'End Historic Route 66 sign Jackson Boulevard Chicago',
      },
      {
        id: 'a4-nutella',
        time: '15:30',
        name: 'Nutella Cafe',
        durationMin: 40,
        optional: true,
        transit: { mode: 'walk', minutes: 5 },
        note: lt(
          'Optional — sweet break right by Millennium Park, only if you feel like it.',
          'Opcional — merienda dulce junto a Millennium Park, solo si apetece.',
        ),
        mapsQuery: 'Nutella Cafe Chicago',
      },
      {
        id: 'a4-lincoln',
        time: '16:45',
        name: 'Lincoln Park (stroll, not the zoo)',
        durationMin: 75,
        transit: { mode: 'bus', minutes: 25, detail: lt('bus 151/22 from Michigan Ave', 'bus 151/22 desde Michigan Ave') },
        note: lt(
          'A walk in the park only — the zoo itself would take 3+ hours.',
          'Solo un paseo por el parque — el zoo en sí llevaría 3+ horas.',
        ),
        mapsQuery: 'Lincoln Park Chicago',
      },
      {
        id: 'a4-r66-new',
        time: '19:00',
        name: 'New Route 66 Begin Sign',
        durationMin: 10,
        transit: { mode: 'bus', minutes: 40, detail: lt('bus 151 south, then toward Navy Pier', 'bus 151 al sur y luego hacia Navy Pier') },
        note: lt('On the way to Navy Pier.', 'De camino a Navy Pier.'),
        mapsQuery: '41.89121,-87.60923',
      },
      {
        id: 'a4-navy',
        time: '19:15',
        name: 'Navy Pier — evening walk',
        durationMin: 45,
        transit: { mode: 'walk', minutes: 5 },
        note: lt('Lake views + the Ferris wheel lit up.', 'Vistas del lago + la noria iluminada.'),
        mapsQuery: 'Navy Pier Chicago',
      },
      {
        id: 'a4-dinner',
        time: '20:00',
        name: 'Dinner at Navy Pier',
        durationMin: 90,
        note: lt('On the pier or nearby — decide on the spot.', 'En el muelle o cerca — decidid sobre la marcha.'),
        mapsQuery: 'restaurants Navy Pier Chicago',
      },
    ],
  },
  {
    id: 'aug5',
    date: 'Aug 5',
    title: lt('Wed Aug 5 · car + hit the road', 'Mié 5 ago · coche + carretera'),
    steps: [
      {
        id: 'a5-checkout',
        time: '08:30',
        name: 'Hotel check-out',
        durationMin: 10,
        note: lt('Take the bags — you go straight to the car.', 'Con las maletas — vais directos al coche.'),
      },
      {
        id: 'a5-hertz',
        time: '09:00',
        name: 'Hertz — West Washington Street (car pickup)',
        durationMin: 30,
        transit: { mode: 'taxi', minutes: 5, detail: lt('~5 min taxi with bags (or ~20 min walk)', '~5 min en taxi con maletas (o ~20 min a pie)') },
        note: lt(
          'Pick up the rental. Check the car over and load the bags.',
          'Recogida del coche de alquiler. Revisadlo y cargad las maletas.',
        ),
        mapsQuery: 'Hertz Car Rental - Chicago - West Washington Street',
      },
      {
        id: 'a5-united',
        time: '09:45',
        name: 'United Center — Michael Jordan statue + Bulls store',
        durationMin: 60,
        transit: { mode: 'car', minutes: 10 },
        note: lt(
          'The only far-from-downtown sight — and it sits west, ON the way out of the city. Statue plaza is free; the team store usually opens 10:00 (offseason hours — verify).',
          'El único punto lejos del centro — y queda al oeste, DE CAMINO al salir de la ciudad. La plaza de la estatua es gratis; la tienda suele abrir a las 10:00 (horario de temporada baja — verificad).',
        ),
        mapsQuery: 'United Center Chicago',
      },
      {
        id: 'a5-depart',
        time: '10:45',
        name: 'Hit the road — I-55 South to St. Louis',
        note: lt('Day 1 of the road trip begins!', '¡Empieza el día 1 del road trip!'),
      },
    ],
  },
];

export function planDayById(id: string): PlanDay | undefined {
  return CHICAGO_PLAN.find((d) => d.id === id);
}
