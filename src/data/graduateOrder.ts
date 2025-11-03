export type PaymentStatus = 'Pendiente' | 'Pagado' | 'En proceso';

export interface GraduateOrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentStatusBadge = 'pending' | 'paid' | 'processing';

export interface GraduateOrder {
  graduateName: string;
  graduateId: string;
  eventDate: string;
  venue: string;
  orderId: string;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentStatusBadge: PaymentStatusBadge;
  items: GraduateOrderItem[];
  referenceCode: string;
  concept: string;
  lastStatusUpdate: string;
}

export const graduateOrder: GraduateOrder = {
  graduateName: 'Daniela Martinez',
  graduateId: 'GRAD-28452',
  eventDate: '2025-12-15T23:00:00Z',
  venue: 'Centro de Convenciones Aurora - Salon Cascada',
  orderId: 'ORD-98342',
  currency: 'MXN',
  paymentStatus: 'Pendiente',
  paymentStatusBadge: 'pending',
  referenceCode: 'BBVA-872910',
  concept: 'Paquete experiencia ceremonia Drag',
  lastStatusUpdate: '2025-11-01T22:15:00Z',
  items: [
    {
      id: 'item-1',
      name: 'Elemento 1',
      description: 'Kit de memorabilia y toga personalizada',
      quantity: 1,
      unitPrice: 1250,
    },
    {
      id: 'item-2',
      name: 'Elemento 2',
      description: 'Acceso VIP a ceremonia y recepcion',
      quantity: 1,
      unitPrice: 890,
    },
    {
      id: 'item-3',
      name: 'Elemento 3',
      description: 'Paquete de fotografia y video profesional',
      quantity: 1,
      unitPrice: 420,
    },
  ],
};

export function calculateOrderTotals(order: GraduateOrder) {
  const subtotal = order.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  return {
    subtotal,
    total: subtotal,
  };
}
