import { useEffect, useMemo, useState } from 'react';

type PaymentMethodId = 'mercadopago' | 'codi' | 'bbva';

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  accent: string;
  description: string;
  badge: string;
  features: string[];
};

type TimelineCheckpoint = {
  title: string;
  description: string;
  helper?: string;
};

type DepositReference = {
  id: string;
  bank: string;
  account: string;
  alias: string;
  reference: string;
  concept: string;
  status: 'Pendiente' | 'Procesando' | 'Confirmado';
};

const paymentMethods: PaymentMethod[] = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago Checkout Pro',
    accent: 'from-[#1d1f3b] via-[#2d37ff] to-[#41a8ff]',
    description:
      'Ideal para pagos con tarjeta, wallets y cuotas. Personaliza la preferencia de pago y rastrea cada evento en tiempo real.',
    badge: 'Pagos con tarjeta y wallets',
    features: [
      'Preferencias dinámicas para montos y conceptos',
      'Redirección transparente con retorno personalizado',
      'Webhook de notificaciones para conciliar estados',
    ],
  },
  {
    id: 'codi',
    name: 'Pago inmediato con CoDi®',
    accent: 'from-[#0f1729] via-[#01a29c] to-[#05f2c7]',
    description:
      'Genera códigos QR interoperables y confirma cobros con notificaciones push. Pensado para pagos presenciales o remotos.',
    badge: 'QR interoperable',
    features: [
      'QR dinámico ligado al importe y vigencia',
      'Recepción de confirmaciones vía socket o webhook',
      'Soporte para anexar conceptos extendidos',
    ],
  },
  {
    id: 'bbva',
    name: 'Transferencia SPEI BBVA',
    accent: 'from-[#160b29] via-[#5c2dab] to-[#916bff]',
    description:
      'Optimiza conciliación de SPEI automáticas con referencias únicas y validación de comprobantes.',
    badge: 'SPEI automatizado',
    features: [
      'Validación de depósitos entrantes por webhook',
      'Conciliación automática con referencia estructurada',
      'Notificaciones proactivas al usuario final',
    ],
  },
];

const flowTimeline: TimelineCheckpoint[] = [
  {
    title: 'Configuración de la orden',
    description: 'Definimos monto, concepto y expiración dependiendo del método elegido.',
    helper: 'Los montos se normalizan en MXN con soporte multi-moneda para Mercado Pago.',
  },
  {
    title: 'Redirección o despliegue de QR',
    description: 'El cliente completa los datos o escanea un código CoDi. Validamos en tiempo real la sesión de pago.',
    helper: 'Sockets y webhooks mantienen sincronizado el estado del pago en la UI.',
  },
  {
    title: 'Confirmación y conciliación',
    description: 'Se confirma el cobro, generamos folio interno y notificamos vía email/SMS.',
    helper: 'Las referencias bancarias actualizan paneles administrativos para depósito y SPEI.',
  },
];

const references: DepositReference[] = [
  {
    id: 'ref-01',
    bank: 'BBVA Empresarial',
    account: '012 345 6789 0123 4567',
    alias: 'DragPayments BBVA',
    reference: 'BBVA-872910',
    concept: 'SPEI en línea',
    status: 'Pendiente',
  },
  {
    id: 'ref-02',
    bank: 'Mercado Pago Wallet',
    account: 'Cuenta virtual 002 123 456789',
    alias: 'DragPayments MP',
    reference: 'MP-198234',
    concept: 'Checkout Pro',
    status: 'Procesando',
  },
  {
    id: 'ref-03',
    bank: 'Cuenta concentradora',
    account: 'CLABE 032 180 00000000000',
    alias: 'Drag CoDi',
    reference: 'CODI-781234',
    concept: 'Cobro CoDi',
    status: 'Confirmado',
  },
];

const statusToAccent: Record<DepositReference['status'], string> = {
  Pendiente: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Procesando: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  Confirmado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

export function PaymentFlowPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('mercadopago');
  const [activeCheckpoint, setActiveCheckpoint] = useState(0);
  const [copiedReferenceId, setCopiedReferenceId] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveCheckpoint((prev) => (prev + 1) % flowTimeline.length);
    }, 3200);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!copiedReferenceId) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopiedReferenceId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedReferenceId]);

  const activeMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedMethod) ?? paymentMethods[0],
    [selectedMethod],
  );

  const handleCopy = (value: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {
        // Silently ignore clipboard errors; UI feedback still occurs.
      });
    }

    setCopiedReferenceId(id);
  };

  return (
    <div className="min-h-screen bg-[#040404] text-[#cfd3da]">
      <header className="border-b border-white/5 bg-[#040404]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">
              Flujo de cobros omnicanal
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Centro de pagos Drag</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#9aa0aa]">
              Orquesta cobros con Mercado Pago, CoDi y BBVA desde una única interfaz. Visualiza estados en vivo, genera referencias y sincroniza la confirmación con tu backoffice.
            </p>
          </div>
          <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-5 text-sm text-white shadow-lg">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" />
            <p className="text-xs uppercase tracking-[0.4em] text-[#94bfff]">Estado simulado</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-4xl font-semibold text-white">$2,560.00</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
                Pagado
              </span>
            </div>
            <p className="mt-3 text-xs text-[#afb5c3]">
              Ultimo pago confirmado hace 12 segundos por Mercado Pago Checkout.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Selecciona el método de cobro</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#9aa0aa]">UI interactiva</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {paymentMethods.map((method) => {
                const isActive = method.id === selectedMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
                      isActive
                        ? 'border-white/40 bg-white/10 shadow-[0_20px_45px_rgba(67,132,255,0.35)]'
                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_18px_40px_rgba(67,132,255,0.25)]'
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80 ${method.accent}`} />
                    <div className="relative flex h-full flex-col gap-4 px-5 pb-6 pt-6 text-left">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#8eaaff]">
                        {method.badge}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-white transition-transform duration-500 group-hover:-translate-y-0.5">
                          {method.name}
                        </h3>
                        <p className="mt-2 text-sm text-[#9aa0aa]">{method.description}</p>
                      </div>
                      <ul className="mt-auto space-y-2 text-xs text-[#b5bbc7]">
                        {method.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-tr from-white via-white to-transparent opacity-70" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div
                      className={`pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-100 ${
                        isActive ? 'opacity-100' : ''
                      }`}
                    >
                      <div className={`absolute -inset-20 bg-gradient-to-br ${method.accent} opacity-40 blur-3xl`} />
                    </div>
                  </button>
                );
              })}
            </div>

            <MethodDetails method={activeMethod} />
          </div>
          <FlowTimeline activeCheckpoint={activeCheckpoint} />
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/5 bg-[#050505]/80 p-8 shadow-[0_22px_55px_rgba(15,23,42,0.4)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 via-emerald-400/20 to-transparent text-emerald-200">
                🔁
              </span>
              <div>
                <h3 className="text-lg font-semibold text-white">Sistema de referencias bancarias</h3>
                <p className="text-sm text-[#9aa0aa]">
                  Genera referencias únicas para depósitos y transferencias. El usuario recibe instrucciones claras mientras la conciliación ocurre en automático.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {references.map((reference) => {
                const accent = statusToAccent[reference.status];
                const isCopied = copiedReferenceId === reference.id;
                return (
                  <article
                    key={reference.id}
                    className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,16,48,0.55)]`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />
                    <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-base font-semibold text-white">{reference.bank}</h4>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] ${accent}`}>
                            {reference.status}
                          </span>
                        </div>
                        <dl className="grid gap-3 text-sm text-[#b5bbc7] md:grid-cols-2">
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Cuenta / CLABE</dt>
                            <dd className="mt-1 font-medium text-white/90">{reference.account}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Alias de cobro</dt>
                            <dd className="mt-1 font-medium text-white/90">{reference.alias}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Referencia</dt>
                            <dd className="mt-1 font-medium text-white/90">{reference.reference}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Concepto</dt>
                            <dd className="mt-1 font-medium text-white/90">{reference.concept}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="flex flex-col items-stretch gap-3 md:w-44">
                        <button
                          type="button"
                          onClick={() => handleCopy(reference.reference, reference.id)}
                          className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-500 hover:border-white/30 hover:bg-white/20 ${
                            isCopied ? 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-[#050505]' : ''
                          }`}
                        >
                          <span className="relative z-10">{isCopied ? 'Referencia copiada' : 'Copiar referencia'}</span>
                          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-emerald-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        </button>
                        <p className="text-xs text-[#818a99]">
                          Las referencias se desactivan automáticamente cuando el pago se confirma vía webhook.
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#111a2b] to-[#1c2333] p-8 text-sm">
            <div className="absolute -top-20 right-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
            <h4 className="text-lg font-semibold text-white">Instrucciones para el cliente final</h4>
            <ul className="mt-6 space-y-4 text-[#adb4c2]">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-300" />
                <span>
                  Envía un correo con el resumen del pago, el monto y la referencia. Incluye el QR CoDi en formato SVG o deep link para abrir la app bancaria.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-300" />
                <span>
                  Permite que el usuario cambie de método sin perder el progreso. Mantén la preferencia de Mercado Pago durante 30 minutos con estado de reserva.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-purple-300" />
                <span>
                  Cuando el SPEI se confirme, envía comprobante y folio interno con un botón CTA para descargar factura.
                </span>
              </li>
            </ul>
            <div className="mt-8 rounded-2xl border border-white/5 bg-white/5 p-4 text-xs text-[#9aa0aa]">
              <p>
                Estas vistas utilizan datos simulados para ilustrar animaciones, estados y componentes que la API deberá alimentar en tiempo real.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

type MethodDetailsProps = {
  method: PaymentMethod;
};

function MethodDetails({ method }: MethodDetailsProps) {
  if (method.id === 'mercadopago') {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0b0b0f] via-[#11172a] to-[#1b2335] p-8 shadow-[0_20px_60px_rgba(14,22,43,0.45)]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Checkout Pro dinámico</h3>
            <p className="text-sm text-[#9aa0aa]">
              Construye una preferencia con items, metadatos y URLs de retorno. Controla el modo sandbox o producción desde variables.
            </p>
          </div>
          <span className="payment-pill-gradient">
            <span>SDK + Webhook</span>
          </span>
        </header>
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl border border-white/5 bg-black/30 p-6 text-sm text-[#b5bbc7]">
            <div className="flex flex-col gap-3">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Monto</label>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white">MXN</span>
                <input
                  readOnly
                  value="2,560.00"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-[#4f5665] focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">Concepto</label>
              <input
                readOnly
                value="Suscripción Drag Premium"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-[#4f5665] focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#6f7785]">URLs de retorno</label>
              <div className="grid gap-2 text-xs">
                <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[#94a0b8]">https://drag.dev/pagos/success</span>
                <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[#94a0b8]">https://drag.dev/pagos/pending</span>
                <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[#94a0b8]">https://drag.dev/pagos/failure</span>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-[#b5bbc7]">
            <div className="absolute -right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-sky-500/30 blur-3xl" />
            <div className="absolute -left-12 top-10 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl" />
            <p className="text-xs uppercase tracking-[0.35em] text-[#6f7785]">Eventos webhook</p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                <div>
                  <p className="font-medium text-white">payment.updated</p>
                  <p>Sincroniza el estado approved, pending o rejected inmediatamente.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" />
                <div>
                  <p className="font-medium text-white">merchant_order.updated</p>
                  <p>Notifica cambios de shipping o devoluciones asociadas.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-purple-300" />
                <div>
                  <p className="font-medium text-white">subscription_authorized_payment.created</p>
                  <p>Renueva suscripciones con tokenización segura.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (method.id === 'codi') {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#051610] via-[#06251e] to-[#0f3e33] p-8 shadow-[0_20px_60px_rgba(6,26,24,0.45)]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Cobro CoDi con QR dinámico</h3>
            <p className="text-sm text-[#9ad3c2]">
              Genera un QR interoperable con vigencia y recibe confirmación inmediata cuando el cliente autoriza desde su app bancaria.
            </p>
          </div>
          <span className="payment-pill-gradient">
            <span>QR + Socket</span>
          </span>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-emerald-500/20 bg-black/30 p-6 text-center text-sm text-[#9ad3c2]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,180,170,0.25),_transparent_65%)]" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-3xl border-8 border-white/5 bg-white p-4 text-black shadow-[0_16px_40px_rgba(4,64,54,0.5)]">
              <div className="h-full w-full animate-qr-scan rounded-lg bg-[radial-gradient(circle,_rgba(0,0,0,0.7),_rgba(0,0,0,1))]" />
            </div>
            <p className="relative">Escanea desde BBVA, Citibanamex, Santander o cualquier app compatible.</p>
            <div className="relative inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-200">
              Vigencia 05:00
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-[#b5f5e7]">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#67b9a6]">Cuenta a cobrar</label>
              <input
                readOnly
                value="DragPayments - CoDi"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#67b9a6]">Concepto ampliado</label>
              <textarea
                readOnly
                rows={4}
                value={
                  'Pago de evento Drag Experience - incluye acceso VIP, kit y estacionamiento. Folio interno DX-92831.'
                }
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.35em] text-[#67b9a6]">Callback confirmado</label>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-[#9ad3c2]">
                POST https://drag.dev/api/callbacks/codi — <span className="text-emerald-200">status: authorized</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-[#9ad3c2]">
            <h4 className="text-base font-semibold text-white">Estados en vivo</h4>
            <ul className="space-y-3 text-xs">
              <li className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
                12:20:04 — QR generado y enviado al cliente.
              </li>
              <li className="rounded-xl border border-emerald-500/20 bg-black/40 p-3">
                12:20:36 — Cliente abrió la app bancaria.
              </li>
              <li className="rounded-xl border border-emerald-500/20 bg-black/40 p-3">
                12:21:10 — Autenticando con CoDi® ID.
              </li>
              <li className="rounded-xl border border-emerald-500/20 bg-black/40 p-3">
                12:21:18 — <span className="text-emerald-200">Pago confirmado y conciliado.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#120d1f] via-[#1d1636] to-[#271f4b] p-8 shadow-[0_20px_60px_rgba(18,12,38,0.45)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Transferencia SPEI BBVA</h3>
          <p className="text-sm text-[#b6a6f5]">
            Solicita transferencias con referencia estructurada, valida SPEI entrantes y genera comprobantes descargables.
          </p>
        </div>
        <span className="payment-pill-gradient">
          <span>SPEI + Notificaciones</span>
        </span>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-[#d0c9f5]">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.35em] text-[#9d8fe5]">Referencia estructurada</label>
            <input
              readOnly
              value="BBVA-872910"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.35em] text-[#9d8fe5]">Concepto</label>
            <input
              readOnly
              value="Implementación plataforma Drag"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.35em] text-[#9d8fe5]">Webhook de confirmación</label>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-[#c2b6f9]">
              POST https://drag.dev/api/spei/webhook — <span className="text-emerald-200">status: credited</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.35em] text-[#9d8fe5]">Comprobante descargable</label>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-[#c2b6f9]">
              GET https://drag.dev/api/spei/receipts/BBVA-872910.pdf
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-[#d0c9f5]">
          <h4 className="text-base font-semibold text-white">Seguimiento automático</h4>
          <ul className="space-y-3 text-xs">
            <li className="rounded-xl border border-violet-500/40 bg-violet-500/20 p-3 text-violet-100">
              SPEI recibido — validando coincidencia de monto y referencia.
            </li>
            <li className="rounded-xl border border-violet-500/30 bg-black/30 p-3">
              Conciliación exitosa — saldo actualizado en el dashboard.
            </li>
            <li className="rounded-xl border border-violet-500/30 bg-black/30 p-3">
              Envío de CFDI programado con sello digital.
            </li>
            <li className="rounded-xl border border-violet-500/30 bg-black/30 p-3">
              Notificación push y correo enviados al titular.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

type FlowTimelineProps = {
  activeCheckpoint: number;
};

function FlowTimeline({ activeCheckpoint }: FlowTimelineProps) {
  return (
    <aside className="h-full rounded-3xl border border-white/5 bg-[#05070f]/80 p-6 shadow-[0_18px_50px_rgba(10,16,28,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Timeline de orquestación</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-[#8eaaff]">
          Tiempo real
        </span>
      </div>
      <ul className="mt-6 space-y-5">
        {flowTimeline.map((checkpoint, index) => {
          const isActive = index === activeCheckpoint;
          const isCompleted = index < activeCheckpoint;
          return (
            <li
              key={checkpoint.title}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-500 ${
                isActive ? 'shadow-[0_18px_45px_rgba(67,132,255,0.25)]' : ''
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r from-[#1d4ed8]/20 via-[#0ea5e9]/10 to-transparent opacity-0 transition-opacity duration-500 ${
                  isActive ? 'opacity-100' : ''
                }`}
              />
              <div className="relative flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="space-y-2 text-sm text-[#9aa0aa]">
                  <p className="text-base font-semibold text-white">{checkpoint.title}</p>
                  <p>{checkpoint.description}</p>
                  {checkpoint.helper ? <p className="text-xs text-[#6f7785]">{checkpoint.helper}</p> : null}
                </div>
              </div>
              <div className="relative mt-5 h-1 rounded-full bg-white/5">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-transparent transition-all duration-700 ${
                    isActive ? 'w-full' : isCompleted ? 'w-full opacity-60' : 'w-4'
                  }`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
