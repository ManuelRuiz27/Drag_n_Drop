import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../../utils';
import { calculateOrderTotals, graduateOrder } from '../../data/graduateOrder';
import { storeProducts } from '../../data/storeProducts';

type PaymentMethodId = 'mercadopago' | 'codi' | 'bbva';

type MercadoPagoPreferenceResponse = {
  initPoint?: string;
  sandboxInitPoint?: string;
  preferenceId?: string;
  expiresAt?: string;
};

type MercadoPagoPaymentStatus = {
  id: string;
  status: string;
  statusDetail?: string;
  amount: number;
  currency: string;
  approvedAt?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  lastUpdatedAt?: string;
};

type CodiQrResponse = {
  codiId: string;
  qrData: string;
  deeplink: string;
  expiresAt: string;
};

type CodiChargeStatus = {
  codiId: string;
  status: string;
  authorizedAt?: string;
  payerAccount?: string;
  amount?: number;
  currency?: string;
  updatedAt?: string;
};

type MercadoPagoCheckout = {
  open: () => void;
};

type MercadoPagoSdk = {
  checkout: (options: { preferenceId: string; autoOpen?: boolean }) => MercadoPagoCheckout;
};

type MercadoPagoConstructor = new (key: string, options?: { locale?: string }) => MercadoPagoSdk;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

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
    status: 'activo'
  },
  {
    id: 'codi',
    title: 'CoDi',
    summary: 'Escanea y autoriza pagos inmediatos con QR interoperable.',
    status: 'activo'
  },
  {
    id: 'bbva',
    title: 'Transferencia SPEI BBVA',
    summary: 'Conciliacion automatica con referencias unicas.',
    status: 'activo'
  }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: graduateOrder.currency
  }).format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function translateCodiStatus(status?: string) {
  if (!status) {
    return 'Desconocido';
  }

  switch (status.toLowerCase()) {
    case 'pending':
      return 'Pendiente';
    case 'authorized':
      return 'Autorizado';
    case 'completed':
      return 'Completado';
    case 'expired':
      return 'Expirado';
    case 'rejected':
      return 'Rechazado';
    case 'cancelled':
    case 'canceled':
      return 'Cancelado';
    default:
      return status;
  }
}

function isCodiStatusFinal(status?: string) {
  if (!status) {
    return false;
  }

  const normalized = status.toLowerCase();
  return ['authorized', 'completed', 'expired', 'rejected', 'cancelled', 'canceled'].includes(
    normalized
  );
}

function getCountdownLabel(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) {
    return { expired: false, label: '--:--' };
  }

  const target = Date.parse(expiresAt);
  if (Number.isNaN(target)) {
    return { expired: false, label: '--:--' };
  }

  const diff = target - now;
  if (diff <= 0) {
    return { expired: true, label: 'Expirado' };
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return {
    expired: false,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
}

export function PaymentFlowPage() {
  const orderTotals = useMemo(() => calculateOrderTotals(graduateOrder), []);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('mercadopago');

  const [mercadopagoInstance, setMercadopagoInstance] = useState<MercadoPagoSdk | null>(null);
  const [payerEmail, setPayerEmail] = useState('daniela.martinez@example.com');
  const [payerName, setPayerName] = useState('Daniela');
  const [payerSurname, setPayerSurname] = useState('Martinez');
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [preferenceUrl, setPreferenceUrl] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [preferenceExpiresAt, setPreferenceExpiresAt] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const [paymentStatusInput, setPaymentStatusInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<MercadoPagoPaymentStatus | null>(null);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);
  const [isFetchingPaymentStatus, setIsFetchingPaymentStatus] = useState(false);

  const [isGeneratingCodi, setIsGeneratingCodi] = useState(false);
  const [codiQr, setCodiQr] = useState<CodiQrResponse | null>(null);
  const [codiStatus, setCodiStatus] = useState<CodiChargeStatus | null>(null);
  const [codiError, setCodiError] = useState<string | null>(null);
  const [isRefreshingCodiStatus, setIsRefreshingCodiStatus] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const windowOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? '';
    if (!publicKey) {
      setMercadopagoInstance(null);
      return;
    }

    const handleLoad = () => {
      if (window.MercadoPago) {
        setMercadopagoInstance(new window.MercadoPago(publicKey, { locale: 'es-MX' }));
      }
    };

    if (window.MercadoPago) {
      handleLoad();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>('script#mercadopago-sdk');
    if (!script) {
      script = document.createElement('script');
      script.id = 'mercadopago-sdk';
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', handleLoad);
    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, []);

  useEffect(() => {
    if (!codiQr?.expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [codiQr?.expiresAt]);

  useEffect(() => {
    if (preferenceId) {
      setPaymentStatusInput(preferenceId);
    }
  }, [preferenceId]);

  const refreshCodiStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      const codiId = codiQr?.codiId;

      if (!codiId) {
        return;
      }

      if (!options?.silent) {
        setIsRefreshingCodiStatus(true);
        setCodiError(null);
      }

      try {
        const status = await apiRequest<CodiChargeStatus>({
          path: `/api/codi/charges/${encodeURIComponent(codiId)}`,
          method: 'GET'
        });
        setCodiStatus(status);
      } catch (error) {
        if (!options?.silent) {
          setCodiError(error instanceof Error ? error.message : 'No se pudo consultar el estado de CoDi.');
        }
      } finally {
        if (!options?.silent) {
          setIsRefreshingCodiStatus(false);
        }
      }
    },
    [codiQr?.codiId]
  );

  useEffect(() => {
    if (!codiQr?.codiId) {
      return;
    }

    if (isCodiStatusFinal(codiStatus?.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshCodiStatus({ silent: true });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [codiQr?.codiId, codiStatus?.status, refreshCodiStatus]);

  const codiCountdown = useMemo(
    () => getCountdownLabel(codiQr?.expiresAt ?? null, now),
    [codiQr?.expiresAt, now]
  );

  const handleCreatePreference = async () => {
    setPreferenceError(null);
    setPreferenceUrl(null);
    setPreferenceId(null);
    setPreferenceExpiresAt(null);
    setPaymentStatus(null);
    setPaymentStatusError(null);
    setCopyStatus('idle');

    setIsCreatingPreference(true);

    try {
      const payload = {
        amount: orderTotals.total,
        currency: graduateOrder.currency,
        description: graduateOrder.concept,
        orderId: graduateOrder.orderId,
        externalReference: graduateOrder.referenceCode,
        metadata: {
          graduateId: graduateOrder.graduateId,
          orderId: graduateOrder.orderId,
          reference: graduateOrder.referenceCode
        },
        payer: {
          email: payerEmail.trim() || undefined,
          name: payerName.trim() || undefined,
          surname: payerSurname.trim() || undefined
        },
        items: graduateOrder.items.map((item) => ({
          id: item.id,
          title: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        redirectUrls: windowOrigin
          ? {
              success: `${windowOrigin}/#/payments?status=success`,
              pending: `${windowOrigin}/#/payments?status=pending`,
              failure: `${windowOrigin}/#/payments?status=failure`
            }
          : undefined
      };

      const response = await apiRequest<MercadoPagoPreferenceResponse>({
        path: '/api/mercadopago/preferences',
        method: 'POST',
        body: payload
      });

      const checkoutUrl = response.initPoint ?? response.sandboxInitPoint ?? null;
      setPreferenceUrl(checkoutUrl);
      setPreferenceId(response.preferenceId ?? null);
      setPreferenceExpiresAt(response.expiresAt ?? null);

      if (mercadopagoInstance && response.preferenceId) {
        try {
          const checkout = mercadopagoInstance.checkout({
            preferenceId: response.preferenceId,
            autoOpen: true
          });
          checkout.open();
          return;
        } catch (sdkError) {
          console.error('Mercado Pago checkout fallback', sdkError);
        }
      }

      if (checkoutUrl && typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      } else {
        setPreferenceError('Mercado Pago no devolvio un enlace de pago valido.');
      }
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'No se pudo generar la preferencia.');
    } finally {
      setIsCreatingPreference(false);
    }
  };

  const handleCopyPreferenceUrl = async () => {
    if (!preferenceUrl || typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyStatus('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(preferenceUrl);
      setCopyStatus('copied');
      window.setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Clipboard error', error);
      setCopyStatus('error');
    }
  };

  const handleCheckPaymentStatus = async () => {
    const identifier = paymentStatusInput.trim() || preferenceId || graduateOrder.orderId;

    if (!identifier) {
      setPaymentStatusError('Ingresa un identificador de pago valido.');
      return;
    }

    setPaymentStatusError(null);
    setIsFetchingPaymentStatus(true);

    try {
      const status = await apiRequest<MercadoPagoPaymentStatus>({
        path: `/api/mercadopago/payments/${encodeURIComponent(identifier)}`,
        method: 'GET'
      });

      setPaymentStatus(status);
    } catch (error) {
      setPaymentStatus(null);
      setPaymentStatusError(
        error instanceof Error ? error.message : 'No se pudo obtener el estado del pago.'
      );
    } finally {
      setIsFetchingPaymentStatus(false);
    }
  };

  const handleGenerateCodi = async () => {
    setCodiError(null);
    setIsGeneratingCodi(true);
    setCodiStatus(null);

    try {
      const payload = {
        amount: orderTotals.total,
        concept: graduateOrder.concept,
        orderId: graduateOrder.orderId,
        expirationMinutes: 5
      };

      const response = await apiRequest<CodiQrResponse>({
        path: '/api/codi/qr',
        method: 'POST',
        body: payload
      });

      setCodiQr(response);
      setNow(Date.now());
    } catch (error) {
      setCodiQr(null);
      setCodiError(error instanceof Error ? error.message : 'No se pudo generar el QR de CoDi.');
    } finally {
      setIsGeneratingCodi(false);
    }
  };

  const handleOpenCodiDeeplink = () => {
    if (!codiQr?.deeplink || typeof window === 'undefined') {
      return;
    }

    window.open(codiQr.deeplink, '_blank', 'noopener');
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
                Gestiona los canales de pago para la orden{' '}
                <strong className="text-[#d4af37]">#{graduateOrder.orderId}</strong> y sincroniza
                estados desde el panel administrativo.
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
                  <span
                    className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                      method.status === 'activo'
                        ? 'border-[#d4af37] text-[#d4af37]'
                        : 'border-[#2a2a2a] text-[#7a7a7a]'
                    }`}
                  >
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4 text-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Datos del pagador</p>
                <div className="mt-3 space-y-3">
                  <label className="block text-xs uppercase tracking-[0.28em] text-[#7a7a7a]">
                    Email
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(event) => setPayerEmail(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                      placeholder="cliente@example.com"
                    />
                  </label>
                  <label className="block text-xs uppercase tracking-[0.28em] text-[#7a7a7a]">
                    Nombre
                    <input
                      type="text"
                      value={payerName}
                      onChange={(event) => setPayerName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                      placeholder="Nombre"
                    />
                  </label>
                  <label className="block text-xs uppercase tracking-[0.28em] text-[#7a7a7a]">
                    Apellido
                    <input
                      type="text"
                      value={payerSurname}
                      onChange={(event) => setPayerSurname(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                      placeholder="Apellido"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4 text-sm text-[#d6d6d6]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Pasos rapidos</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[#c8c8c8]">
                  <li>
                    Envia los datos de la orden al endpoint{' '}
                    <code className="text-[#d4af37]">POST /api/mercadopago/preferences</code>.
                  </li>
                  <li>
                    Redirige al comprador al enlace devuelto (
                    <code className="text-[#d4af37]">initPoint</code>).
                  </li>
                  <li>Escucha webhooks y consulta pagos para confirmar el estado.</li>
                </ol>
              </div>
            </div>

            {preferenceError && (
              <div className="rounded-2xl border border-[#d62d2d]/60 bg-[#2a0909] px-4 py-3 text-sm text-[#f3aaaa]">
                {preferenceError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreatePreference}
                disabled={isCreatingPreference}
                className="inline-flex items-center justify-center rounded-2xl border border-[#d4af37] bg-[#111111] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingPreference ? 'Generando preferencia...' : 'Crear preferencia y pagar'}
              </button>
              {preferenceUrl && (
                <button
                  type="button"
                  onClick={handleCopyPreferenceUrl}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#0b0b0b] px-5 py-3 text-sm font-semibold text-[#d4af37] transition hover:border-[#d4af37]/80 hover:bg-[#111111]"
                >
                  {copyStatus === 'copied' ? 'Enlace copiado' : 'Copiar enlace'}
                </button>
              )}
            </div>

            {copyStatus === 'error' && (
              <p className="text-xs text-[#f87171]">No se pudo copiar el enlace al portapapeles.</p>
            )}

            {preferenceUrl && (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 text-xs text-[#c8c8c8]">
                <p className="text-sm text-white">Preferencia creada</p>
                <dl className="mt-3 space-y-2">
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">ID</dt>
                    <dd>{preferenceId ?? 'Sin id'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Expira</dt>
                    <dd>{formatDateTime(preferenceExpiresAt)}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">URL</dt>
                    <dd className="break-all">
                      <a
                        className="text-[#d4af37]"
                        href={preferenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {preferenceUrl}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 text-sm text-[#d6d6d6]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Consultar estado</p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={paymentStatusInput}
                  onChange={(event) => setPaymentStatusInput(event.target.value)}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                  placeholder="ID de pago o preferencia"
                />
                <button
                  type="button"
                  onClick={handleCheckPaymentStatus}
                  disabled={isFetchingPaymentStatus}
                  className="inline-flex items-center justify-center rounded-xl border border-[#d4af37] bg-[#111111] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFetchingPaymentStatus ? 'Consultando...' : 'Consultar'}
                </button>
              </div>
              {paymentStatusError && (
                <p className="mt-3 text-xs text-[#f87171]">{paymentStatusError}</p>
              )}
              {paymentStatus && (
                <dl className="mt-4 grid gap-y-2 text-xs text-[#c8c8c8] sm:grid-cols-2">
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Estado</dt>
                    <dd>{paymentStatus.status}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Detalle</dt>
                    <dd>{paymentStatus.statusDetail ?? 'N/A'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Monto</dt>
                    <dd>{formatCurrency(paymentStatus.amount)}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Orden</dt>
                    <dd>{paymentStatus.orderId ?? graduateOrder.orderId}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Actualizacion</dt>
                    <dd>{formatDateTime(paymentStatus.approvedAt ?? paymentStatus.lastUpdatedAt)}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-semibold text-[#d4af37]">Moneda</dt>
                    <dd>{paymentStatus.currency}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>
        )}

        {selectedMethod === 'codi' && (
          <section className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#0a0a0a] p-6 text-sm text-[#d6d6d6] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">CoDi QR interoperable</h3>
                <p className="text-xs text-[#9e9e9e]">
                  Genera un codigo dinamico y monitorea el estado de autorizacion del pago.
                </p>
              </div>
              <span className="rounded-full border border-[#d4af37] bg-[#111111] px-4 py-1 text-xs uppercase tracking-[0.28em] text-[#d4af37]">
                Total: {formatCurrency(orderTotals.total)}
              </span>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Resumen de la orden</p>
                <dl className="mt-3 space-y-2 text-xs text-[#c8c8c8]">
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-[#d4af37]">Concepto</dt>
                    <dd>{graduateOrder.concept}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-[#d4af37]">Orden</dt>
                    <dd>{graduateOrder.orderId}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-[#d4af37]">Referencia</dt>
                    <dd>{graduateOrder.referenceCode}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Pasos rapidos</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[#c8c8c8]">
                  <li>Solicita a tu backend generar el QR con POST /api/codi/qr.</li>
                  <li>Muestra el QR al cliente y habilita el deeplink en banca movil.</li>
                  <li>Consulta estado con GET /api/codi/charges/:id o espera el webhook.</li>
                </ol>
              </div>
            </div>

            {codiError && (
              <div className="rounded-2xl border border-[#d62d2d]/60 bg-[#2a0909] px-4 py-3 text-[#f3aaaa]">
                {codiError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateCodi}
              disabled={isGeneratingCodi}
              className="inline-flex items-center justify-center rounded-2xl border border-[#d4af37] bg-[#111111] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingCodi ? 'Generando QR...' : codiQr ? 'Regenerar QR CoDi' : 'Generar QR CoDi'}
            </button>

            {codiQr && (
              <div className="grid gap-6 md:grid-cols-[240px,1fr]">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <div className="rounded-xl bg-white p-3">
                    <img src={codiQr.qrData} alt="Codigo QR CoDi" className="h-48 w-48 object-contain" />
                  </div>
                  <span
                    className={`text-xs uppercase tracking-[0.3em] ${
                      codiCountdown.expired ? 'text-[#f87171]' : 'text-[#d4af37]'
                    }`}
                  >
                    {codiCountdown.expired ? 'QR expirado' : `Expira en ${codiCountdown.label}`}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Detalle del QR</p>
                    <dl className="mt-3 grid gap-y-2 text-xs text-[#c8c8c8] sm:grid-cols-2">
                      <div className="flex flex-col">
                        <dt className="font-semibold text-[#d4af37]">ID</dt>
                        <dd>{codiQr.codiId}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="font-semibold text-[#d4af37]">Vence</dt>
                        <dd>{formatDateTime(codiQr.expiresAt)}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="font-semibold text-[#d4af37]">Deeplink</dt>
                        <dd className="break-all">{codiQr.deeplink}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleOpenCodiDeeplink}
                      className="inline-flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#d4af37] transition hover:border-[#d4af37]/80 hover:bg-[#111111]"
                    >
                      Abrir en banca movil
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshCodiStatus()}
                      disabled={isRefreshingCodiStatus}
                      className="inline-flex items-center justify-center rounded-xl border border-[#d4af37] bg-[#111111] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRefreshingCodiStatus ? 'Consultando...' : 'Actualizar estado'}
                    </button>
                  </div>

                  {codiStatus && (
                    <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Estado del cobro</p>
                      <dl className="mt-3 grid gap-y-2 text-xs text-[#c8c8c8] sm:grid-cols-2">
                        <div className="flex flex-col">
                          <dt className="font-semibold text-[#d4af37]">Estado</dt>
                          <dd>{translateCodiStatus(codiStatus.status)}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="font-semibold text-[#d4af37]">Autorizado</dt>
                          <dd>{formatDateTime(codiStatus.authorizedAt)}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="font-semibold text-[#d4af37]">Cuenta pagadora</dt>
                          <dd>{codiStatus.payerAccount ?? 'N/A'}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="font-semibold text-[#d4af37]">Actualizacion</dt>
                          <dd>{formatDateTime(codiStatus.updatedAt)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {selectedMethod === 'bbva' && (
          <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#0b0b0b] p-6 text-sm text-[#b8b8b8] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <h3 className="text-lg font-semibold text-white">Transferencia SPEI BBVA</h3>
            <p>
              Usa el endpoint <code className="text-[#d4af37]">POST /api/spei/references</code> para generar referencias unicas y conciliarlas de forma automatica desde tu backend. Este flujo permanece disponible como alternativa al pago con Mercado Pago o CoDi.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
