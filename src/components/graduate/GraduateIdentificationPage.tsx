import { useMemo, useState } from 'react';

import { calculateOrderTotals, graduateOrder } from '../../data/graduateOrder';
import { storeProducts } from '../../data/storeProducts';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: graduateOrder.currency,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function GraduateIdentificationPage() {
  const totals = useMemo(() => calculateOrderTotals(graduateOrder), []);
  const [cart, setCart] = useState<Record<string, number>>({});

  const cartItems = useMemo(
    () =>
      storeProducts
        .map((product) => ({
          product,
          quantity: cart[product.id] ?? 0,
        }))
        .filter((entry) => entry.quantity > 0),
    [cart]
  );

  const extrasTotal = useMemo(
    () => cartItems.reduce((accumulator, entry) => accumulator + entry.product.price * entry.quantity, 0),
    [cartItems]
  );

  const totalDue = totals.total + extrasTotal;

  const addProductToCart = (productId: string) => {
    setCart((previous) => ({
      ...previous,
      [productId]: (previous[productId] ?? 0) + 1,
    }));
  };

  const removeProductFromCart = (productId: string) => {
    setCart((previous) => {
      const current = previous[productId] ?? 0;
      if (current <= 1) {
        const { [productId]: _removed, ...rest } = previous;
        return rest;
      }

      return {
        ...previous,
        [productId]: current - 1,
      };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d6d6d6]">
      <header className="border-b border-[#2a2a2a] bg-[#050505]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="inline-block rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-1 text-xs uppercase tracking-[0.28em] text-[#d4af37]">
              Identificacion de graduado
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{graduateOrder.graduateName}</h1>
              <p className="mt-1 text-sm text-[#b8b8b8]">ID: {graduateOrder.graduateId}</p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-[#b8b8b8]">
              <div>
                <span className="text-xs uppercase tracking-[0.32em] text-[#7a7a7a]">Evento</span>
                <p className="text-base text-white">{formatDate(graduateOrder.eventDate)}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.32em] text-[#7a7a7a]">Lugar</span>
                <p>{graduateOrder.venue}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#2a2a2a] bg-[#0a0a0a] px-6 py-6 text-sm text-white shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b4b4b4]">Saldo base</p>
            <p className="mt-3 text-4xl font-semibold text-white">{formatCurrency(totals.total)}</p>
            <p className="mt-2 text-xs text-[#c6cad5]">Orden #{graduateOrder.orderId}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/60 px-4 py-1 text-xs font-medium uppercase tracking-wide text-[#d4af37]">
              {graduateOrder.paymentStatus}
            </span>
            <p className="mt-3 text-xs text-[#8d96a6]">
              Ultima actualizacion: {formatDate(graduateOrder.lastStatusUpdate)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#0b0b0b] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Tienda de extras</h3>
              <p className="text-xs text-[#9e9e9e]">Agrega servicios complementarios para personalizar la experiencia.</p>
            </div>
            <span className="rounded-full border border-[#2a2a2a] bg-[#101010] px-3 py-1 text-xs text-[#b8b8b8]">
              Productos disponibles: {storeProducts.length}
            </span>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {storeProducts.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <article
                  key={product.id}
                  className="rounded-2xl border border-[#1f1f1f] bg-[#101010] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h4 className="text-base font-semibold text-white">{product.name}</h4>
                      <p className="text-xs text-[#a6a6a6]">{product.description}</p>
                    </div>
                    {product.badge ? (
                      <span className="rounded-full border border-[#d4af37]/60 bg-[#111111] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">
                        {product.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-semibold text-[#d4af37]">{formatCurrency(product.price)}</span>
                    <div className="flex items-center gap-2">
                      {quantity > 0 && (
                        <button
                          type="button"
                          onClick={() => removeProductFromCart(product.id)}
                          className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-xs font-semibold text-[#d6d6d6] transition hover:border-[#d4af37]"
                        >
                          Quitar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => addProductToCart(product.id)}
                        className="rounded-xl border border-[#d4af37] bg-[#141414] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505]"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {quantity > 0 && (
                    <p className="mt-2 text-xs text-[#c5c5c5]">
                      En carrito: <span className="font-semibold text-white">{quantity}</span> ·{' '}
                      <span className="font-semibold text-[#d4af37]">{formatCurrency(product.price * quantity)}</span>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#090909] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Carrito</h3>
              <p className="text-xs text-[#9e9e9e]">Controla los extras agregados antes de continuar al pago.</p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              className="rounded-full border border-[#2a2a2a] px-4 py-2 text-xs font-semibold text-[#bdbdbd] transition hover:border-[#d4af37] hover:text-[#d4af37]"
              disabled={cartItems.length === 0}
            >
              Vaciar
            </button>
          </header>

          <div className="space-y-3 text-sm">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2a2a2a] bg-[#0f0f0f] px-4 py-6 text-center text-[#9e9e9e]">
                Aun no hay extras en el carrito. Agrega servicios desde la tienda.
              </div>
            ) : (
              cartItems.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-[#101010] px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{product.name}</span>
                    <span className="text-xs text-[#9ea0a8]">Cantidad: {quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeProductFromCart(product.id)}
                      className="rounded-full border border-[#2a2a2a] px-3 py-1 text-xs text-[#bdbdbd] transition hover:border-[#d4af37] hover:text-[#d4af37]"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => addProductToCart(product.id)}
                      className="rounded-full border border-[#2a2a2a] px-3 py-1 text-xs text-[#bdbdbd] transition hover:border-[#d4af37] hover:text-[#d4af37]"
                    >
                      +
                    </button>
                    <span className="text-sm font-semibold text-[#d4af37]">
                      {formatCurrency(product.price * quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 text-sm text-[#d6d6d6]">
            <div className="flex items-center justify-between">
              <span>Orden base</span>
              <span className="font-semibold text-white">{formatCurrency(totals.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Extras</span>
              <span className="font-semibold text-white">{formatCurrency(extrasTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[#d4af37]">
              <span>Total actualizado</span>
              <span>{formatCurrency(totalDue)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#0b0b0d] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-[#b9b9b9]">Modulo de pago</span>
              <h2 className="mt-2 text-xl font-semibold text-white">Redirige al centro de cobros</h2>
            </div>
            <span className="rounded-full border border-[#d4af37] bg-[#101010] px-4 py-1 text-xs uppercase tracking-[0.28em] text-[#d4af37]">
              Total: {formatCurrency(totalDue)}
            </span>
          </header>
          <p className="text-sm text-[#a7a7a7]">
            Completa el cobro en el flujo omnicanal de pagos. El total incluye los extras seleccionados. Al continuar se sincroniza la informacion y podras actualizar el estado desde el panel.
          </p>
          <div className="grid gap-4 text-sm text-[#d6d6d6] sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Base orden</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(totals.total)}</p>
            </div>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Extras</p>
              <p className="mt-2 text-lg font-semibold text-[#d4af37]">{formatCurrency(extrasTotal)}</p>
            </div>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7a7a7a]">Metodo sugerido</p>
              <p className="mt-2 text-base font-semibold text-white">Mercado Pago Checkout</p>
            </div>
          </div>
          <a
            href="#payments"
            className="inline-flex items-center justify-center rounded-2xl border border-[#d4af37] bg-[#111111] px-5 py-3 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#050505]"
          >
            Abrir centro de pagos
          </a>
        </section>
      </main>
    </div>
  );
}
