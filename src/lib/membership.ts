// Puertas de la membresía — la ventana en la que SE PUEDE ENTRAR.
//
// Emi cierra las puertas los meses en que el tema es progresivo (cada semana se
// apoya en la anterior, ver el copy del mes en Landing.astro): pasada la fecha,
// nadie entra hasta la reapertura. Este módulo es la ÚNICA fuente de verdad de
// esas dos fechas, igual que STRIPE_FOUNDER_UNTIL lo es del precio: lo usan la
// carta (para el contador y el estado «cerrado» de los botones) y el checkout
// (para no crear la sesión de Stripe). Misma fecha en los dos = no se desalinean.
//
// Las fechas van en ISO **con zona horaria explícita** (`+02:00` = horario de
// verano de Madrid, CEST; `+01:00` en invierno, CET). Sin zona, el servidor las
// leería en UTC y el cierre caería una o dos horas antes de lo prometido.
//
// ⚠️ SE CAMBIAN CADA MES, junto con el bloque `month*` de la carta:
//   MEMBERSHIP_CLOSES_AT   cuándo se cierran las puertas de este ciclo.
//   MEMBERSHIP_REOPENS_AT  cuándo vuelven a abrirse (vacío = siguen cerradas).

// Cierre del ciclo en curso. Por defecto, el que promete el copy de septiembre
// de 2026: miércoles 2 a las 23:59 CEST.
export const CLOSES_AT = process.env.MEMBERSHIP_CLOSES_AT || '2026-09-02T23:59:59+02:00';

// Reapertura. Por defecto el 1 de octubre de 2026, que es lo que promete la FAQ
// («durante septiembre no entra nadie»). Si se deja VACÍO, las puertas se quedan
// cerradas indefinidamente hasta que alguien ponga una fecha.
export const REOPENS_AT = process.env.MEMBERSHIP_REOPENS_AT ?? '2026-10-01T00:00:00+02:00';

// Alta al newsletter (Klaviyo). Vive aquí porque la usan la carta y la página de
// «puertas cerradas» del checkout: es la salida para quien llega tarde.
export const NEWSLETTER_URL = 'https://manage.kmail-lists.com/subscriptions/subscribe?a=TPxGBg&g=SaE8Px';

// ¿Están cerradas AHORA? Sin fecha de cierre válida → abierto (estado por
// defecto: una membresía sin configurar no debe dejar de vender).
export function doorsClosed(now: Date = new Date()): boolean {
  const closes = Date.parse(CLOSES_AT);
  if (Number.isNaN(closes)) return false;
  if (now.getTime() <= closes) return false;
  const reopens = Date.parse(REOPENS_AT);
  if (!Number.isNaN(reopens) && now.getTime() >= reopens) return false;
  return true;
}
