import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Each cart item: { id, asset, color }
// Dedup key = `${asset.id}|${color}` so the same icon at two colors is two entries.

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const add = useCallback((asset, color, svg) => {
    const normalizedColor = (color || '#000000').toLowerCase();
    const key = `${asset.id}|${normalizedColor}`;
    setItems((curr) => {
      if (curr.some((it) => it.key === key)) return curr;
      return [...curr, { key, asset, color: normalizedColor, svg }];
    });
  }, []);

  const remove = useCallback((key) => {
    setItems((curr) => curr.filter((it) => it.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback(
    (assetId, color) => {
      const normalizedColor = (color || '#000000').toLowerCase();
      const key = `${assetId}|${normalizedColor}`;
      return items.some((it) => it.key === key);
    },
    [items]
  );

  const value = useMemo(
    () => ({ items, add, remove, clear, has, count: items.length }),
    [items, add, remove, clear, has]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
