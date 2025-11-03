import { useMemo, useState } from 'react';

import { apiRequest } from '../../utils';
import { calculateOrderTotals, graduateOrder } from '../../data/graduateOrder';
import { storeProducts } from '../../data/storeProducts';

type PaymentMethodId = 'mercadopago' | 'codi' | 'bbva';

type MercadoPagoPreferenceResponse = {
  initPoint?: string;
  sandboxInitPoint?: string;
  preferenceId?: string;
};

const paymentMethods: Array<{
  id: PaymentMethodId;
  title: string;
  summary: string;
  status: 'activo' | 'pendiente';
}> = [
  {
    id: 'mercadopago',
    title: 'Mercado Pago Checkout Pro',
    summary: 'Tarjetas, wallets y cuotas en un flujo hospedado.',
    status: 'activo',
  },
  {
    id: 'codi',
    title: 'CoDi (pendiente)',
    summary: 'Integracion en curso. Se activara cuando el backend este listo.',
    status: 'pendiente',
  },
  {
    id: 'bbva',
    title: 'Transferencia SPEI BBVA',
    summary: 'Conciliacion automatica con referencias unicas.',
    status: 'activo',
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: graduateOrder.currency,
  }).format(value);
}

export function PaymentFlowPage() {
  const orderTotals = useMemo(() => calculateOrderTotals(graduateOrder), []);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('mercadopago');
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [preferenceUrl, setPreferenceUrl] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  const windowOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCreatePreference = async () => {
    setPreferenceError(null);
    setPreferenceUrl(null);
    setPreferenceId(null);

    setIsCreatingPreference(true);

    try {
      const payload = {
        amount: orderTotals.total,
        currency: graduateOrder.currency,
        description: graduateOrder.concept,
        orderId: graduateOrder.orderId,
        metadata: {
          graduateId: graduateOrder.graduateId,
        },
        items: graduateOrder.items.map((item) => ({
          id: item.id,
          title: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        redirectUrls: windowOrigin
          ? {
              success: `${windowOrigin}/#/payments?status=success`,
              pending: `${windowOrigin}/#/payments?status=pending`,
              failure: `${windowOrigin}/#/payments?status=failure`,
            }
          : undefined,
      };

      const response = await apiRequest<MercadoPagoPreferenceResponse>({
        path: '/api/mercadopago/preferences',
        method: 'POST',
        body: payload,
      });

      const checkoutUrl = response.initPoint ?? response.sandboxInitPoint ?? null;
      setPreferenceUrl(checkoutUrl);
      setPreferenceId(response.preferenceId ?? null);

      if (checkoutUrl && typeof window !== 'undefined') {
        window.open(checkoutUrl, '_blank', 'noopener');
      }
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'No se pudo generar la preferencia.');
    } finally {
      setIsCreatingPreference(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d6d6d6]">
      <header className="border-b border-[#2a2a2a] bg-[#050505]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="inline-block rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-1 text-xs uppercase tracking-[0.28em] text-[#d4af37]">
              Centro de pagos
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Flujo de cobro omnicanal</h1>
              <p className="mt-2 text-sm text-[#a2a2a2]">
                Gestiona los canales de pago para la orden <strong className="text-[#d4af37]">#{graduateOrder.orderId}</strong>{' '}
                y sincroniza estados desde el panel administrativo.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-[#2a2a2a] bg-[#0a0a0a] px-6 py-6 text-sm text-white shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b5b5b5]">Total base</p>
            <p className="mt-3 text-4xl font-semibold text-white">{formatCurrency(orderTotals.total)}</p>
            <p className="mt-3 text-xs text-[#8d96a6]">Graduado: {graduateOrder.graduateName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Metodos disponibles</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Selecciona un canal</span>
          </header>
          <div className="grid gap-4 sm:grid-cols-3">
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className={`rounded-3xl border px-4 py-5 text-left transition ${
                    isSelected
                      ? 'border-[#d4af37] bg-[#111111] shadow-[0_0_30px_rgba(212,175,55,0.15)]'
                      : 'border-[#2a2a2a] bg-[#0b0b0b] hover:border-[#d4af37]/60'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{method.title}</p>
                  <p className="mt-2 text-xs text-[#9e9e9e]">{method.summary}</p>
                  <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                    method.status === 'activo'
                      ? 'border-[#d4af37] text-[#d4af37]'
                      : 'border-[#2a2a2a] text-[#7a7a7a]'
                  }`}>
                    {method.status === 'activo' ? 'Activo' : 'Pendiente'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedMethod === 'mercadopago' && (
          <section className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#0a0a0a] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Mercado Pago Checkout Pro</h3>
                <p className="text-xs text-[#9e9e9e]">
                  Genera una preferencia hospedada y redirige al comprador para completar el pago.
                </p>
              </div>
              <span className="rounded-full border border-[#d4af37] bg-[#111111] px-4 py-1 text-xs uppercase tracking-[0.28em] text-[#d4af37]">
                Total a pagar: {formatCurrency(orderTotals.total)}
              </span>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Detalle de la orden</p>
                <ul className="mt-3 space-y-2 text-sm text-[#c8c8c8]">
                  {graduateOrder.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="text-[#d4af37]">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Extras sugeridos</p>
                <ul className="mt-3 space-y-2 text-sm text-[#c8c8c8]">
                  {storeProducts.slice(0, 3).map((product) => (
                    <li key={product.id} className="flex items-center justify-between">
                      <span>{product.name}</span>
                      <span className="text-[#d4af37]">{formatCurrency(product.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 text-sm text-[#d6d6d6]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Pasos rapidos</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[#c8c8c8]">
                <li>Enviar datos de la orden al endpoint <code className="text-[#d4af37]">POST /api/mercadopago/preferences</code>.</li>
                <li>Redirigir al comprador al enlace devuelto (<code className="text-[#d4af37]">initPoint</code>).</li>
                <li>Escuchar webhooks y consultar pagos para confirmar el estado.</li>
              </ol>
            </div>

            {preferenceError && (
              <div className="rounded-2xl border border-[#d62d2d]/60 bg-[#2a0909] px-4 py-3 text-sm text-[#f3aaaa]">
                {preferenceError}
              </div>
            )}

            {preferenceUrl && (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-xs text-[#c8c8c8]">
                <p>
                  Preferencia creada:
                  <span className="ml-2 text-[#d4af37]">{preferenceId ?? 'sin id'}</span>
                </p>
                <p className="mt-2 truncate">
                  URL: <a className="text-[#d4af37]" href={preferenceUrl} target="_blank" rel="noopener noreferrer">{preferenceUrl}</a>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreatePreference}
              disabled={isCreatingPreference}
              className="inline-flex items-center justify-center rounded-2xl border border-[#d4af37] bg-[#111111] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingPreference ? 'Generando preferencia...' : 'Crear preferencia y pagar'}
            </button>
          </section>
        )}

        {selectedMethod === 'codi' && (
          <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#0b0b0b] p-6 text-sm text-[#b8b8b8] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <h3 className="text-lg font-semibold text-white">CoDi</h3>
            <p>
              El modulo de CoDi se habilitara cuando el backend exponga la generacion de codigos y la confirmacion de cobros.
              Mientras tanto puedes utilizar Mercado Pago o SPEI BBVA.
            </p>
          </section>
        )}

        {selectedMethod === 'bbva' && (
          <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#0b0b0b] p-6 text-sm text-[#b8b8b8] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <h3 className="text-lg font-semibold text-white">Transferencia SPEI BBVA</h3>
            <p>
              Usa el endpoint <code className="text-[#d4af37]">POST /api/spei/references</code> para generar referencias
              unicas y conciliarlas automaticamente desde tu backend. Este flujo permanece disponible como alternativa al
              pago con Mercado Pago.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
