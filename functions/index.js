const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

// Tentaremos carregar as credenciais, mas se o arquivo não existir (porque é ignorado no git),
// não podemos quebrar o deploy todo.
let SERVICE_ACCOUNT_FILE = null;
try {
  SERVICE_ACCOUNT_FILE = require('./service-account.json');
} catch (e) {
  console.log("Arquivo service-account.json não encontrado localmente. Certifique-se de adicioná-lo antes de fazer o deploy.");
}

// O e-mail da Laura vai ser guardado no firebase functions config ou hardcoded
const CALENDAR_ID = process.env.LAURA_CALENDAR_EMAIL || 'institutobioflores@gmail.com';

const DATE_RE = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$|^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseAppointmentDate(rawDate) {
  if (typeof rawDate !== 'string') return null;
  const m = rawDate.match(DATE_RE);
  if (!m) return null;
  let dia, mes, ano;
  if (m[1]) { dia = m[1]; mes = m[2]; ano = m[3]; }
  else { ano = m[4]; mes = m[5]; dia = m[6]; }
  const d = parseInt(dia, 10), mo = parseInt(mes, 10), y = parseInt(ano, 10);
  if (!d || !mo || !y || d < 1 || d > 31 || mo < 1 || mo > 12 || y < 2024 || y > 2100) return null;
  return { dia: String(d).padStart(2,'0'), mes: String(mo).padStart(2,'0'), ano: String(y) };
}

exports.syncAppointmentToCalendar = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    if (!SERVICE_ACCOUNT_FILE) {
      console.error("Falta arquivo service-account.json nas functions!");
      return null;
    }

    const data = snap.data() || {};

    // Validação dos campos obrigatórios
    if (!data.date || !data.time || !data.serviceName || !data.clientName) {
      console.warn('[syncCalendar] documento ignorado: campos obrigatórios ausentes', context.params?.appointmentId);
      return null;
    }
    const parsed = parseAppointmentDate(data.date);
    if (!parsed) {
      console.warn('[syncCalendar] data inválida:', data.date);
      return snap.ref.update({ googleSyncError: 'invalid-date' });
    }
    if (!TIME_RE.test(String(data.time))) {
      console.warn('[syncCalendar] hora inválida:', data.time);
      return snap.ref.update({ googleSyncError: 'invalid-time' });
    }

    const { dia, mes, ano } = parsed;
    const startTime = `${ano}-${mes}-${dia}T${data.time}:00-03:00`;
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      console.warn('[syncCalendar] data resultante inválida:', startTime);
      return snap.ref.update({ googleSyncError: 'invalid-datetime' });
    }
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = {
      summary: `${data.serviceName} - ${data.clientName}`,
      description: `Telefone: ${data.phone || '-'}\nEmail: ${data.email || '-'}\nAgendado pelo App Bioflores.`,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: endDate.toISOString(),   timeZone: 'America/Sao_Paulo' },
    };

    const jwtClient = new google.auth.JWT(
      SERVICE_ACCOUNT_FILE.client_email,
      null,
      SERVICE_ACCOUNT_FILE.private_key,
      ['https://www.googleapis.com/auth/calendar.events']
    );

    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    try {
      await jwtClient.authorize();
      const res = await calendar.events.insert({ calendarId: CALENDAR_ID, resource: event });
      console.log('[syncCalendar] evento criado:', res.data.id);
      return snap.ref.update({ googleCalendarEventId: res.data.id, googleSyncError: null });
    } catch (error) {
      console.error('[syncCalendar] erro ao criar evento:', error?.message || error);
      return snap.ref.update({ googleSyncError: String(error?.message || 'unknown').slice(0, 200) });
    }
  });
