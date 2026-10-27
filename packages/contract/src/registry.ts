import { compareText, isDefinedRoute, pathShape, type Route } from './define-route.ts';
import { type OpenApiDocument, type OpenApiInfo, toOpenApi } from './openapi.ts';

export interface RouteRegistry {
  add<T extends Route>(route: T): T;
  all(): readonly Route[];
  get(id: string): Route | undefined;
  publicRoutes(): readonly string[];
  openapi(info: OpenApiInfo): OpenApiDocument;
}

function shapeKey(route: Route): string {
  return `${route.method} ${pathShape(route.path)}`;
}

function compareRoutes(a: Route, b: Route): number {
  return compareText(a.path, b.path) || compareText(a.method, b.method);
}

export function createRegistry(): RouteRegistry {
  const byId = new Map<string, Route>();
  const byShape = new Map<string, Route>();
  const pathByShape = new Map<string, string>();

  const all = (): readonly Route[] => [...byId.values()].sort(compareRoutes);

  return {
    add<T extends Route>(route: T): T {
      if (!isDefinedRoute(route)) {
        throw new Error(`registry: ${route.id} was not created by defineRoute`);
      }
      if (byId.has(route.id)) {
        throw new Error(`registry: duplicate route id ${route.id}`);
      }
      const shape = shapeKey(route);
      const clash = byShape.get(shape);
      if (clash !== undefined) {
        const reason =
          clash.path === route.path
            ? `duplicate route ${route.method} ${route.path}`
            : `ambiguous route ${route.method} ${route.path} clashes with ${clash.path}`;
        throw new Error(`registry: ${reason} (${route.id} vs ${clash.id})`);
      }
      const plain = pathShape(route.path);
      const known = pathByShape.get(plain);
      if (known !== undefined && known !== route.path) {
        throw new Error(
          `registry: ${route.path} differs only in param names from ${known} (${route.id})`,
        );
      }
      byId.set(route.id, route);
      byShape.set(shape, route);
      pathByShape.set(plain, route.path);
      return route;
    },
    all,
    get: (id) => byId.get(id),
    publicRoutes: () =>
      all()
        .filter((route) => route.auth.includes('public'))
        .map((route) => `${route.method} ${route.path}`)
        .sort(compareText),
    openapi: (info) => toOpenApi(all(), info),
  };
}
