export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  badge?: string;
}

export const storeProducts: StoreProduct[] = [
  {
    id: 'toga-rental',
    name: 'Renta de toga premium',
    description: 'Incluye planchado profesional, accesorios y bolsa protectora para la ceremonia.',
    price: 650,
    badge: 'Indispensable',
  },
  {
    id: 'photo-session',
    name: 'Sesion de fotografia',
    description: 'Sesion personal con 12 fotos editadas y acceso a galeria digital.',
    price: 980,
    badge: 'Recuerdo',
  },
  {
    id: 'after-party',
    name: 'After party VIP',
    description: 'Acceso a la celebracion posterior con bebidas ilimitadas y DJ invitado.',
    price: 1250,
    badge: 'Experiencia',
  },
  {
    id: 'event-pass',
    name: 'Acceso al evento',
    description: 'Entrada general al evento principal con asiento asignado.',
    price: 480,
  },
  {
    id: 'no-meal-pass',
    name: 'Acceso sin platillo',
    description: 'Entrada al evento sin consumo incluido, ideal para invitados adicionales.',
    price: 320,
  },
  {
    id: 'ceo-special',
    name: 'Manoseada al CEO 🤝😏',
    description: 'Un apretón de manos "especial" con el CEO. Guiño, guiño.',
    price: 6969,
    badge: 'ULTRA VIP',
  },
];
