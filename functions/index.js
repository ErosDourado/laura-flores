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

exports.syncAppointmentToCalendar = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    if (!SERVICE_ACCOUNT_FILE) {
      console.error("Falta arquivo service-account.json nas functions!");
      return null;
    }

    const data = snap.data();

    // Converte a data (ex: 28/04/2026) e hora (ex: 14:00) para o formato do Google
    // Certifique-se que o frontend manda 'DD/MM/YYYY' ou adapte aqui
    let dia, mes, ano;
    if (data.date.includes('/')) {
      [dia, mes, ano] = data.date.split('/');
    } else if (data.date.includes('-')) {
      [ano, mes, dia] = data.date.split('-');
    } else {
      console.error("Formato de data não reconhecido:", data.date);
      return null;
    }

    const startTime = `${ano}-${mes}-${dia}T${data.time}:00-03:00`; // Fuso horário de Brasília

    const startDate = new Date(startTime);
    // Assumindo que a consulta dura 1 hora
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = {
      summary: `${data.serviceName} - ${data.clientName}`,
      description: `Telefone: ${data.phone}\\nEmail: ${data.email}\\nAgendado pelo App Bioflores.`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
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
      const res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        resource: event,
      });
      console.log('Evento criado no Google Calendar com sucesso! ID:', res.data.id);

      // Salva o ID do evento do Google no documento do Firebase
      return snap.ref.update({ googleCalendarEventId: res.data.id });
    } catch (error) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      return null;
    }
  });
