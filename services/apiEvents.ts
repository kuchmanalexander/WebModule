// Простой event bus для UI.
// Нужен, чтобы показывать тосты/индикаторы при refresh/logout, не смешивая UI и сетевой слой.

export type ApiUiEvent =
  | { type: 'refresh:start' }
  | { type: 'refresh:success' }
  | { type: 'refresh:failed' }
  | { type: 'session:expired' }
  | { type: 'forbidden' };

export const apiEventBus = new EventTarget();

export function emitApiUiEvent(event: ApiUiEvent) {
  apiEventBus.dispatchEvent(new CustomEvent<ApiUiEvent>('api-ui', { detail: event }));
}
