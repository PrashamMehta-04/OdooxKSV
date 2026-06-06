import { useEffect, useState } from 'react';

export type RouteKey =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'vendors'
  | 'rfqs'
  | 'quotations'
  | 'approvals'
  | 'purchase-orders'
  | 'invoices'
  | 'activity'
  | 'reports';

export function getRoute(): RouteKey {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return normalizeRoute(raw);
}

export function navigate(route: RouteKey) {
  window.location.hash = `#/${route}`;
}

export function useRoute() {
  const [route, setRoute] = useState<RouteKey>(() => getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    onChange();
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function normalizeRoute(raw: string): RouteKey {
  switch (raw) {
    case '':
    case 'dashboard':
      return 'dashboard';
    case 'login':
      return 'login';
    case 'register':
      return 'register';
    case 'vendors':
      return 'vendors';
    case 'rfqs':
      return 'rfqs';
    case 'quotations':
      return 'quotations';
    case 'approvals':
      return 'approvals';
    case 'purchase-orders':
      return 'purchase-orders';
    case 'invoices':
      return 'invoices';
    case 'activity':
      return 'activity';
    case 'reports':
      return 'reports';
    default:
      return 'dashboard';
  }
}

