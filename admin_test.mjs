
import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
                            from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
         setDoc, getDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp, where }
                            from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref as sRef, uploadBytes, getDownloadURL }
                            from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const FB = {
  apiKey: "AIzaSyAcZx6vU7bvWx3hzclQ98PfdqulqiQSvX8",
  authDomain: "lauraflores-10360.firebaseapp.com",
  projectId: "lauraflores-10360",
  storageBucket: "lauraflores-10360.firebasestorage.app",
  messagingSenderId: "1043899124552",
  appId: "1:1043899124552:web:afcc0a6ee44cf4edc2017d"
};
const app     = initializeApp(FB);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ── AUTH ─────────────────────────────────────────────
window.doLogin = async () => {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  btn.textContent = 'Entrando...'; btn.disabled = true; err.classList.add('hidden');
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch { err.textContent = 'E-mail ou senha incorretos.'; err.classList.remove('hidden'); btn.textContent = 'Entrar'; btn.disabled = false; }
};

onAuthStateChanged(auth, async user => {
  document.getElementById('init-loading').classList.add('hidden');
  if (user) {
    let isAdmin = false;
    try {
      const snap = await getDoc(doc(db, 'content', 'admins'));
      if (snap.exists()) isAdmin = (snap.data().emails || []).includes(user.email);
    } catch (e) {
      console.warn("Erro ao verificar admin:", e);
    }

    if (isAdmin) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadAppointments(); loadServices(); loadProcedures(); loadFeatures(); loadTestimonials(); loadAvailability(); loadPromoCard(); loadClients(); loadMessages();
    } else {
      alert("Acesso negado. Você não possui privilégios de administrador.");
      window.location.href = 'index.html';
    }
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
});

document.getElementById('login-password').addEventListener('keydown', e => { if(e.key==='Enter') window.doLogin(); });

// ── TABS ─────────────────────────────────────────────
window.switchTab = tab => {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.remove('tab-active'); btn.classList.add('text-warm-gray/50'); });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  btn.classList.add('tab-active'); btn.classList.remove('text-warm-gray/50');
};

// ── SHARED ───────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── APPOINTMENTS ─────────────────────────────────────
let allAppts = [], currentFilter = 'all', selectedApptDate = null;
let apptCalYear, apptCalMonth;

function loadAppointments() {
  const now = new Date(); apptCalYear = now.getFullYear(); apptCalMonth = now.getMonth();
  onSnapshot(query(collection(db,'appointments'), orderBy('createdAt','desc')), snap => {
    allAppts = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    buildApptCalendar();
    renderAppts();
  });
}

function buildApptCalendar() {
  const title = document.getElementById('appt-cal-title');
  const grid  = document.getElementById('appt-cal-grid');
  if (!title || !grid) return;
  title.textContent = `${MONTHS_PT[apptCalMonth]} ${apptCalYear}`;
  const firstDay    = new Date(apptCalYear, apptCalMonth, 1).getDay();
  const daysInMonth = new Date(apptCalYear, apptCalMonth+1, 0).getDate();
  const apptCounts  = {};
  allAppts.forEach(a => {
    if (!a.date) return;
    const parts = a.date.split('/');
    if (parts.length !== 3) return;
    if (parseInt(parts[2]) === apptCalYear && parseInt(parts[1]) === apptCalMonth+1)
      apptCounts[parseInt(parts[0])] = (apptCounts[parseInt(parts[0])] || 0) + 1;
  });
  let html = '';
  for (let i=0;i<firstDay;i++) html += '<div class="appt-cal-day empty h-9"></div>';
  for (let d=1;d<=daysInMonth;d++) {
    const dateStr = `${String(d).padStart(2,'0')}/${String(apptCalMonth+1).padStart(2,'0')}/${apptCalYear}`;
    const count   = apptCounts[d] || 0;
    const isSel   = selectedApptDate === dateStr;
    html += `<div onclick="pickApptDate('${dateStr}')"
      class="appt-cal-day h-9 flex flex-col items-center justify-center text-xs font-semibold relative
        ${isSel ? 'selected' : count > 0 ? 'text-navy-brand' : 'text-warm-gray/30'}">
      <span>${d}</span>
      ${count > 0 ? `<span class="absolute bottom-1.5 w-1 h-1 rounded-full ${isSel?'bg-white':'bg-rose-gold'}"></span>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
}

window.pickApptDate = dateStr => {
  selectedApptDate = dateStr;
  document.getElementById('clear-appt-date')?.classList.remove('hidden');
  buildApptCalendar(); renderAppts();
};
window.clearApptDate = () => {
  selectedApptDate = null;
  document.getElementById('clear-appt-date')?.classList.add('hidden');
  buildApptCalendar(); renderAppts();
};
window.prevApptMonth = () => { apptCalMonth--; if(apptCalMonth<0){apptCalMonth=11;apptCalYear--;} buildApptCalendar(); };
window.nextApptMonth = () => { apptCalMonth++; if(apptCalMonth>11){apptCalMonth=0;apptCalYear++;} buildApptCalendar(); };

function renderAppts() {
  const list = document.getElementById('appointments-list');
  let data = currentFilter === 'all' ? allAppts : allAppts.filter(a => a.status === currentFilter);
  if (selectedApptDate) data = data.filter(a => a.date === selectedApptDate);
  document.getElementById('appt-count').textContent = `${data.length} encontrado${data.length!==1?'s':''}`;
  if (!data.length) { list.innerHTML = '<div class="text-center py-16 text-warm-gray/30 text-sm">Nenhum agendamento encontrado.</div>'; return; }
  const labels={pending:'Pendente',confirmed:'Confirmado',concluded:'Concluído',cancelled:'Cancelado'};
  const cls={pending:'status-pending',confirmed:'status-confirmed',concluded:'status-concluded',cancelled:'status-cancelled'};
  list.innerHTML = data.map(a => {
    const digits=(a.phone||'').replace(/\D/g,'');
    const wa=digits?`55${digits}`:'';
    
    return `<div class="bg-white rounded-2xl shadow-sm border border-rose-light/20 overflow-hidden mb-4">
      <div class="flex items-center gap-4 p-5 cursor-pointer hover:bg-stone-neutral/50 transition-colors" onclick="toggleApptCard('${a.id}')">
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-navy-brand truncate">${a.clientName||'—'}</p>
          <p class="text-xs text-warm-gray/50 mt-0.5">${a.serviceName} · ${a.date} às ${a.time}</p>
        </div>
        <span class="text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${cls[a.status]||'bg-gray-100 text-gray-500'} flex-shrink-0">${labels[a.status]||a.status}</span>
        <span class="material-symbols-outlined text-warm-gray/30 transition-transform duration-300" id="icon-${a.id}">expand_more</span>
      </div>
      <div id="card-${a.id}" class="hidden border-t border-rose-light/20 bg-stone-neutral/20 p-5 space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="text-[9px] uppercase tracking-widest text-warm-gray/35 font-bold mb-0.5">Telefone</p><p class="font-semibold">${a.phone||'—'}</p></div>
          <div><p class="text-[9px] uppercase tracking-widest text-warm-gray/35 font-bold mb-0.5">E-mail</p><p class="font-semibold text-xs truncate">${a.email||'—'}</p></div>
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-light/20">
          ${wa ? `<button onclick="openWaTemplatesModal('${a.clientName}', '${wa}', '${a.serviceName}', '${a.date}', '${a.time}', '${a.status}')" class="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>Mensagem</button>` : ''}
          <select onchange="updateStatus('${a.id}',this.value)" class="border border-rose-light/40 rounded-xl px-2 py-2 text-[11px] font-bold focus:outline-none cursor-pointer bg-white">
            <option value="pending"   ${a.status==='pending'   ?'selected':''}>Pendente</option>
            <option value="confirmed" ${a.status==='confirmed' ?'selected':''}>Confirmado</option>
            <option value="concluded" ${a.status==='concluded' ?'selected':''}>Concluído</option>
            <option value="cancelled" ${a.status==='cancelled' ?'selected':''}>Cancelado</option>
          </select>
          <button onclick="delAppt('${a.id}')" class="text-warm-gray/25 hover:text-red-400 transition-colors cursor-pointer p-1"><span class="material-symbols-outlined text-xl">delete</span></button>
        </div>
      </div>
    </div>`;
  }).join('');
}
window.filterAppt = filter => {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('border-rose-gold','text-rose-gold'); b.classList.add('border-gray-200','text-warm-gray/60'); });
  const b = document.querySelector(`[data-filter="${filter}"]`);
  b.classList.add('border-rose-gold','text-rose-gold'); b.classList.remove('border-gray-200','text-warm-gray/60');
  renderAppts();
};
window.toggleApptCard = id => {
  const c = document.getElementById(`card-${id}`);
  const i = document.getElementById(`icon-${id}`);
  if(c.classList.contains('hidden')) { c.classList.remove('hidden'); i.style.transform='rotate(180deg)'; }
  else { c.classList.add('hidden'); i.style.transform='rotate(0deg)'; }
};
window.updateStatus = async (id, status) => { 
  await updateDoc(doc(db,'appointments',id),{status}); 
  showToast('Status atualizado'); 
  
  if (status === 'cancelled') {
    const a = allAppts.find(x => x.id === id);
    if (a) {
      try {
        // Buscar TODOS da fila de espera que querem vaga anterior
        const snap = await getDocs(collection(db,'fila_espera'));
        const matches = snap.docs.map(d => ({id: d.id, ...d.data()}))
          .filter(m => m.wantEarlier || m.date === a.date || m.time === a.time);
        if (matches.length > 0) {
          const container = document.getElementById('waitlist-matches-container');
          // Carregar template de mensagem customizado
          let msgTemplate = `Olá {nome}, um horário de {servico} no dia {data} às {hora} acaba de liberar! Deseja confirmar?`;
          try {
            const msgSnap = await getDoc(doc(db,'content','messages'));
            if (msgSnap.exists() && msgSnap.data().waitlist) msgTemplate = msgSnap.data().waitlist;
          } catch {}
          container.innerHTML = matches.map(m => {
            const digits = (m.phone||'').replace(/\D/g,'');
            const wa = digits ? `55${digits}` : '';
            const msgText = msgTemplate.replace(/{nome}/g, m.clientName||'').replace(/{servico}/g, a.serviceName||'').replace(/{data}/g, a.date||'').replace(/{hora}/g, a.time||'');
            const msg = encodeURIComponent(msgText);
            return `
              <div class="p-3 border border-rose-light/40 rounded-xl bg-white flex flex-col gap-2">
                <div>
                  <p class="font-bold text-navy-brand">${m.clientName}</p>
                  <p class="text-[11px] text-warm-gray/60">Quer vaga antes · ${m.phone || ''}</p>
                </div>
                ${wa ? `<a href="https://wa.me/${wa}?text=${msg}" target="_blank" class="flex justify-center items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer w-full"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>Avisar no WhatsApp</a>` : ''}
              </div>
            `;
          }).join('');
          document.getElementById('waitlist-modal').classList.remove('hidden');
        }
      } catch (e) { console.error('Erro ao buscar fila de espera', e); }
    }
  }
};
window.delAppt = async id => { if(!confirm('Excluir?')) return; await deleteDoc(doc(db,'appointments',id)); showToast('Excluído'); };
window.closeWaitlistModal = () => document.getElementById('waitlist-modal').classList.add('hidden');

window.openWaitlistPanel = async () => {
  const container = document.getElementById('waitlist-matches-container');
  container.innerHTML = '<div class="text-center py-4 text-warm-gray/30 text-xs">Carregando fila...</div>';
  document.getElementById('waitlist-modal').classList.remove('hidden');
  
  try {
    const snap = await getDocs(collection(db,'fila_espera'));
    const matches = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    if (!matches.length) {
      container.innerHTML = '<div class="text-center py-8 text-warm-gray/30 text-sm">Nenhum cliente na fila de espera.</div>';
      return;
    }
    
    // Carregar template de mensagem customizado
    let msgTemplate = `Olá {nome}, um horário acaba de liberar! Deseja confirmar?`;
    try {
      const msgSnap = await getDoc(doc(db,'content','messages'));
      if (msgSnap.exists() && msgSnap.data().waitlist) msgTemplate = msgSnap.data().waitlist;
    } catch {}
    
    container.innerHTML = matches.map(m => {
      const digits = (m.phone||'').replace(/\D/g,'');
      const wa = digits ? `55${digits}` : '';
      const msgText = msgTemplate.replace(/{nome}/g, m.clientName||'').replace(/{servico}/g, m.serviceName||'').replace(/{data}/g, m.dateLimit||m.date||'').replace(/{hora}/g, m.time||'');
      const msg = encodeURIComponent(msgText);
      return `
        <div class="p-3 border border-rose-light/40 rounded-xl bg-white flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-bold text-navy-brand">${m.clientName}</p>
              <p class="text-[11px] text-warm-gray/60">${m.serviceName || ''} · ${m.phone || ''}</p>
            </div>
            <button onclick="removeFromWaitlist('${m.id}')" class="text-warm-gray/30 hover:text-red-400 transition-colors cursor-pointer p-1" title="Remover da fila"><span class="material-symbols-outlined text-lg">close</span></button>
          </div>
          ${wa ? `<a href="https://wa.me/${wa}?text=${msg}" target="_blank" class="flex justify-center items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer w-full"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>Avisar no WhatsApp</a>` : ''}
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="text-center py-8 text-red-400 text-sm">Erro ao carregar fila.</div>';
    console.error(e);
  }
};

window.removeFromWaitlist = async id => {
  if (!confirm('Remover este cliente da fila de espera?')) return;
  try {
    await deleteDoc(doc(db,'fila_espera',id));
    showToast('Removido da fila!');
    openWaitlistPanel(); // Recarregar
  } catch (e) { showToast('Erro ao remover.'); console.error(e); }
};

window.openWaTemplatesModal = async (clientName, waPhone, serviceName, date, time, status) => {
  const container = document.getElementById('wa-templates-container');
  container.innerHTML = '<div class="text-center py-4 text-warm-gray/30 text-xs">Carregando...</div>';
  document.getElementById('wa-templates-modal').classList.remove('hidden');
  
  // Carregar mensagens customizadas do Firestore
  let msgs = {};
  try {
    const snap = await getDoc(doc(db,'content','messages'));
    if (snap.exists()) msgs = snap.data();
  } catch {}
  
  const defaults = {
    pending: `Olá {nome}! Passando para confirmar seu agendamento de {servico} no Instituto Bioflores para dia {data} às {hora}. Podemos confirmar?`,
    confirmed: `Olá {nome}! Lembrete do seu horário de {servico} amanhã ({data}) às {hora} conosco. Te esperamos!`,
    concluded: `Olá {nome}, como você está se sentindo após a sessão de {servico}? Qualquer dúvida ou desconforto, pode nos avisar.`,
    cancelled: `Olá {nome}, confirmamos o cancelamento do seu horário de {data} às {hora}. Quando desejar remarcar, estamos à disposição!`,
  };
  const labels = { pending: 'Confirmação', confirmed: 'Lembrete', concluded: 'Pós-atendimento', cancelled: 'Cancelamento' };
  
  const templates = Object.keys(defaults).map(key => {
    const raw = msgs[key] || defaults[key];
    const msg = raw.replace(/{nome}/g, clientName).replace(/{servico}/g, serviceName).replace(/{data}/g, date).replace(/{hora}/g, time);
    return { name: labels[key], msg };
  });
  
  container.innerHTML = templates.map(t => {
    const encoded = encodeURIComponent(t.msg);
    return `
      <a href="https://wa.me/${waPhone}?text=${encoded}" target="_blank" onclick="closeWaTemplatesModal()" class="block p-3 rounded-xl border border-rose-light/40 hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
        <p class="font-bold text-navy-brand text-sm mb-1 flex justify-between">${t.name} <span class="material-symbols-outlined text-green-500 text-sm">send</span></p>
        <p class="text-xs text-warm-gray/60 line-clamp-2">${t.msg}</p>
      </a>
    `;
  }).join('');
};
window.closeWaTemplatesModal = () => document.getElementById('wa-templates-modal').classList.add('hidden');

// ── MESSAGES ─────────────────────────────────────────
const DEFAULT_MSGS = {
  pending: `Olá {nome}! Passando para confirmar seu agendamento de {servico} no Instituto Bioflores para dia {data} às {hora}. Podemos confirmar?`,
  confirmed: `Olá {nome}! Lembrete do seu horário de {servico} amanhã ({data}) às {hora} conosco. Te esperamos!`,
  concluded: `Olá {nome}, como você está se sentindo após a sessão de {servico}? Qualquer dúvida ou desconforto, pode nos avisar.`,
  cancelled: `Olá {nome}, confirmamos o cancelamento do seu horário de {data} às {hora}. Quando desejar remarcar, estamos à disposição!`,
  waitlist: `Olá {nome}, um horário de {servico} no dia {data} às {hora} acaba de liberar! Deseja confirmar?`,
};

async function loadMessages() {
  try {
    const snap = await getDoc(doc(db,'content','messages'));
    const d = snap.exists() ? snap.data() : {};
    ['pending','confirmed','concluded','cancelled','waitlist'].forEach(key => {
      const el = document.getElementById(`msg-${key}`);
      if (el) el.value = d[key] || DEFAULT_MSGS[key] || '';
    });
  } catch {
    // Preencher com defaults se não existe
    ['pending','confirmed','concluded','cancelled','waitlist'].forEach(key => {
      const el = document.getElementById(`msg-${key}`);
      if (el) el.value = DEFAULT_MSGS[key] || '';
    });
  }
}

window.saveMessages = async () => {
  const data = {};
  ['pending','confirmed','concluded','cancelled','waitlist'].forEach(key => {
    const el = document.getElementById(`msg-${key}`);
    if (el) data[key] = el.value.trim();
  });
  await setDoc(doc(db,'content','messages'), data);
  showToast('Mensagens salvas!');
};

// ── SERVICES ─────────────────────────────────────────
let allSvcs = [];
function loadServices() {
  onSnapshot(query(collection(db,'services'), orderBy('order')), snap => {
    allSvcs = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderSvcs();
  });
}
function renderSvcs() {
  const list = document.getElementById('services-list');
  if (!allSvcs.length) { list.innerHTML='<div class="col-span-3 text-center py-16 text-warm-gray/30 text-sm">Nenhum serviço cadastrado.</div>'; return; }
  list.innerHTML = allSvcs.map(s => `
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-rose-light/20 flex flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-bold text-sm uppercase tracking-wide text-navy-brand">${s.name}</h3>
        <span class="text-[9px] font-bold px-2 py-1 rounded-full ${s.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}">${s.active?'Ativo':'Inativo'}</span>
      </div>
      <p class="text-xs text-warm-gray/60 leading-relaxed flex-1">${s.description||'—'}</p>
      <div class="flex gap-2 pt-2 border-t border-rose-light/20">
        <button onclick="toggleSvc('${s.id}',${s.active})" class="flex-1 text-[11px] py-2 rounded-xl border font-bold transition-colors cursor-pointer ${s.active?'border-gray-200 text-warm-gray/50 hover:border-red-200 hover:text-red-400':'border-green-200 text-green-600 hover:bg-green-50'}">${s.active?'Desativar':'Ativar'}</button>
        <button onclick="openSvcModal('${s.id}')" class="flex-1 text-[11px] py-2 rounded-xl bg-stone-neutral text-warm-gray font-bold hover:bg-rose-light/30 transition-colors cursor-pointer">Editar</button>
      </div>
    </div>`).join('');
}
window.toggleSvc = async (id, active) => { await updateDoc(doc(db,'services',id),{active:!active}); showToast(`Serviço ${!active?'ativado':'desativado'}`); };
window.openSvcModal = (id=null) => {
  document.getElementById('svc-id').value=''; document.getElementById('svc-name').value=''; document.getElementById('svc-desc').value=''; document.getElementById('svc-active').checked=true;
  document.getElementById('modal-title').textContent='Novo Serviço';
  if (id) { const s=allSvcs.find(x=>x.id===id); if(s){document.getElementById('svc-id').value=s.id;document.getElementById('svc-name').value=s.name;document.getElementById('svc-desc').value=s.description||'';document.getElementById('svc-active').checked=s.active;document.getElementById('modal-title').textContent='Editar Serviço';}}
  document.getElementById('svc-modal').classList.remove('hidden');
};
window.closeSvcModal = () => document.getElementById('svc-modal').classList.add('hidden');
window.saveSvc = async () => {
  const id=document.getElementById('svc-id').value; const name=document.getElementById('svc-name').value.trim();
  if(!name){showToast('Informe o nome');return;}
  const data={name,description:document.getElementById('svc-desc').value.trim(),active:document.getElementById('svc-active').checked,order:id?(allSvcs.find(s=>s.id===id)?.order??allSvcs.length):allSvcs.length};
  if(id){await updateDoc(doc(db,'services',id),data);showToast('Serviço atualizado');}
  else{await addDoc(collection(db,'services'),data);showToast('Serviço criado');}
  closeSvcModal();
};

// ── FEED / PROCEDURES ────────────────────────────────
let localProcs = [];
const DEFAULT_PROCS = [
  {titulo:'OZONIOTERAPIA',slug:'ozonioterapia',imagem:'assets/treatment.png',descricao:'A ozonioterapia é um tratamento seguro, natural e minimamente invasivo.'},
  {titulo:'BIOESTIMULADORES',slug:'bioestimuladores',imagem:'assets/treatment.png',descricao:'Os bioestimuladores de colágeno estimulam a produção natural de novas fibras.'},
  {titulo:'HARMONIZAÇÃO',slug:'harmonizacao',imagem:'assets/treatment.png',descricao:'A harmonização facial busca o equilíbrio estético e funcional da face.'},
];

async function loadProcedures() {
  const snap = await getDoc(doc(db,'content','procedures'));
  localProcs = snap.exists() ? (snap.data().items||DEFAULT_PROCS) : DEFAULT_PROCS;
  renderProcs();
}

function renderProcs() {
  document.getElementById('procedures-list').innerHTML = localProcs.map((p, i) => `
    <div class="bg-white rounded-xl border border-rose-light/20 shadow-sm overflow-hidden">
      <div class="flex items-center px-5 py-3.5 gap-3 hover:bg-stone-neutral/50 transition-colors">
        <span class="text-[9px] font-bold text-warm-gray/25 uppercase tracking-widest w-14 flex-shrink-0">Proc. ${String(i+1).padStart(2,'0')}</span>
        <span class="font-bold text-sm text-navy-brand flex-1 truncate uppercase">${p.titulo||'Sem título'}</span>
        <button onclick="toggleProcEdit(${i})" class="text-warm-gray/30 hover:text-rose-gold transition-colors flex-shrink-0 cursor-pointer p-1">
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
        <button onclick="removeProc(${i})" class="text-warm-gray/20 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer p-1">
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
      <div id="proc-edit-${i}" class="hidden border-t border-rose-light/20 p-5 bg-stone-neutral/20 space-y-4">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-2">Imagem</label>
          <div class="flex items-center gap-4">
            <img id="proc-img-preview-${i}" src="${p.imagem||'assets/treatment.png'}" class="w-24 h-20 object-cover rounded-xl border border-rose-light/30 flex-shrink-0"/>
            <div class="flex flex-col gap-2">
              <button onclick="document.getElementById('proc-img-${i}').click()" class="flex items-center gap-1.5 border border-rose-light/50 text-warm-gray px-3 py-2 rounded-xl text-[11px] font-bold hover:border-rose-gold hover:text-rose-gold transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-sm">upload</span>Upload de imagem
              </button>
              <input id="proc-img-${i}" type="file" accept="image/*" class="hidden" onchange="uploadProcImg(${i}, this)"/>
              <p class="text-[9px] text-warm-gray/30 uppercase tracking-wider">ou cole a URL abaixo</p>
              <input value="${p.imagem||''}" oninput="localProcs[${i}].imagem=this.value;document.getElementById('proc-img-preview-${i}').src=this.value" placeholder="URL da imagem" class="w-full border border-rose-light/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-gold"/>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Título</label>
          <input value="${p.titulo}" oninput="localProcs[${i}].titulo=this.value;renderProcTitle(${i},this.value)" class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Descrição</label>
          <textarea rows="3" oninput="localProcs[${i}].descricao=this.value" class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold resize-none">${p.descricao}</textarea>
        </div>
        <button onclick="saveProcs()" class="bg-rose-gold text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-deep-rose transition-colors cursor-pointer">
          Salvar
        </button>
      </div>
    </div>`).join('');
}

window.toggleProcEdit = i => document.getElementById(`proc-edit-${i}`).classList.toggle('hidden');
window.renderProcTitle = (i, val) => {
  const el = document.querySelector(`#proc-edit-${i}`)?.closest('.bg-white')?.querySelector('.text-navy-brand');
  if (el) el.textContent = val || 'Sem título';
};

window.uploadProcImg = (i, input) => {
  const file = input.files[0]; if (!file) return;
  input.value = '';
  // Procedure ratio: 4:3 (card image area)
  openCropModal(file, 4/3, async croppedFile => {
    showToast('Enviando imagem...');
    try {
      const storageRef = sRef(storage, `procedures/${i}_${Date.now()}_imagem.jpg`);
      await uploadBytes(storageRef, croppedFile);
      const url = await getDownloadURL(storageRef);
      localProcs[i].imagem = url;
      document.getElementById(`proc-img-preview-${i}`).src = url;
      const urlInput = document.querySelector(`#proc-edit-${i} input[placeholder="URL da imagem"]`);
      if (urlInput) urlInput.value = url;
      showToast('Imagem enviada e link gerado! Salvando procedimentos...');
      await saveProcs();
    } catch (e) { showToast('Erro no upload. Verifique o Storage.'); console.error(e); }
  });
};

window.addProc = () => { localProcs.push({titulo:'',slug:'novo',imagem:'assets/treatment.png',descricao:''}); renderProcs(); };
window.removeProc = i => { if(!confirm('Remover procedimento?')) return; localProcs.splice(i,1); renderProcs(); };
window.saveProcs = async () => { await setDoc(doc(db,'content','procedures'),{items:localProcs}); showToast('Procedimentos salvos!'); };

// ── FEED / FEATURES (Cards Diferenciais) ──────────────────
let localFeatures = [];
const DEFAULT_FEATURES = [
  { icon: 'location_on', title: 'Localização', text: 'Fácil acesso por vias principais com infraestrutura completa.' },
  { icon: 'person', title: 'Equipe qualificada', text: 'Profissionais experientes e altamente treinados.' },
  { icon: 'sentiment_satisfied', title: 'Ambiente acolhedor', text: 'Projetado para conforto e relaxamento total.' },
  { icon: 'workspace_premium', title: '9.000 procedimentos', text: 'Mais de 9 mil procedimentos no Brasil e exterior.' }
];

async function loadFeatures() {
  try {
    const snap = await getDoc(doc(db,'content','home_features'));
    localFeatures = snap.exists() ? (snap.data().items||DEFAULT_FEATURES) : DEFAULT_FEATURES;
  } catch { localFeatures = [...DEFAULT_FEATURES]; }
  renderFeatures();
}

function renderFeatures() {
  document.getElementById('features-list').innerHTML = localFeatures.map((f, i) => `
    <div class="bg-white rounded-xl border border-rose-light/20 shadow-sm overflow-hidden mb-2">
      <div class="flex flex-col p-4 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10">
            <input value="${f.icon}" oninput="localFeatures[${i}].icon=this.value" class="w-full border border-rose-light/30 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-rose-gold text-center" title="Ícone (Google Material Symbols)"/>
          </div>
          <div class="flex-1">
            <input value="${f.title}" oninput="localFeatures[${i}].title=this.value" placeholder="Título" class="w-full border border-rose-light/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-gold font-bold text-navy-brand uppercase tracking-wide"/>
          </div>
        </div>
        <div>
          <textarea rows="2" oninput="localFeatures[${i}].text=this.value" placeholder="Descrição" class="w-full border border-rose-light/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-gold resize-none">${f.text}</textarea>
        </div>
      </div>
    </div>`).join('');
}

window.saveFeatures = async () => { await setDoc(doc(db,'content','home_features'),{items:localFeatures}); showToast('Diferenciais salvos!'); };


// ── FEED / TESTIMONIALS (Depoimentos) ─────────────────────
let localTestimonials = [];
const DEFAULT_TESTIMONIALS = [
  { text: '"Eu já era fã do trabalho que ela mostra no Instagram, fiquei mais fã ainda quando tomei a decisão de me consultar — foi a minha melhor escolha!"', image: 'https://randomuser.me/api/portraits/women/44.jpg', name: 'Lucia Maria', role: 'Paciente' },
  { text: '"Profissional completa! Passa muita confiança em todas as explicações, além de ter uma mão levíssima! Voltarei sempre."', image: 'https://randomuser.me/api/portraits/women/65.jpg', name: 'Mariana Alves', role: 'Paciente' },
  { text: '"Entende todas as expectativas, respeita a natureza do nosso rosto. Estou muito feliz com os resultados."', image: 'https://randomuser.me/api/portraits/women/23.jpg', name: 'Luiza Santos', role: 'Paciente' }
];

async function loadTestimonials() {
  try {
    const snap = await getDoc(doc(db,'content','testimonials'));
    localTestimonials = snap.exists() ? (snap.data().items||DEFAULT_TESTIMONIALS) : DEFAULT_TESTIMONIALS;
  } catch { localTestimonials = [...DEFAULT_TESTIMONIALS]; }
  renderTestimonials();
}

function renderTestimonials() {
  document.getElementById('testimonials-list').innerHTML = localTestimonials.map((t, i) => `
    <div class="bg-white rounded-xl border border-rose-light/20 shadow-sm overflow-hidden mb-2">
      <div class="flex items-center px-5 py-3.5 gap-3 hover:bg-stone-neutral/50 transition-colors">
        <span class="text-[9px] font-bold text-warm-gray/25 uppercase tracking-widest w-16 flex-shrink-0">Depo. ${String(i+1).padStart(2,'0')}</span>
        <span class="font-bold text-sm text-navy-brand flex-1 truncate uppercase">${t.name||'Sem nome'}</span>
        <button onclick="toggleTestimonialEdit(${i})" class="text-warm-gray/30 hover:text-rose-gold transition-colors flex-shrink-0 cursor-pointer p-1">
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
        <button onclick="removeTestimonial(${i})" class="text-warm-gray/20 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer p-1">
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
      <div id="testim-edit-${i}" class="hidden border-t border-rose-light/20 p-5 bg-stone-neutral/20 space-y-4">
        <div class="flex gap-4">
          <div class="w-16">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Foto (URL)</label>
            <img src="${t.image||'https://via.placeholder.com/150'}" id="testim-img-preview-${i}" class="w-12 h-12 rounded-full object-cover mb-2 ring-2 ring-rose-light"/>
          </div>
          <div class="flex-1">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">URL da imagem</label>
            <input value="${t.image||''}" oninput="localTestimonials[${i}].image=this.value;document.getElementById('testim-img-preview-${i}').src=this.value||'https://via.placeholder.com/150'" placeholder="https://..." class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Nome</label>
            <input value="${t.name}" oninput="localTestimonials[${i}].name=this.value;renderTestimonialTitle(${i},this.value)" class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold"/>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Papel (Ex: Paciente)</label>
            <input value="${t.role}" oninput="localTestimonials[${i}].role=this.value" class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold"/>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-widest text-warm-gray/50 mb-1.5">Depoimento</label>
          <textarea rows="3" oninput="localTestimonials[${i}].text=this.value" class="w-full border border-rose-light/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-gold resize-none">${t.text}</textarea>
        </div>
        <button onclick="saveTestimonials()" class="bg-rose-gold text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-deep-rose transition-colors cursor-pointer">
          Salvar
        </button>
      </div>
    </div>`).join('');
}

window.toggleTestimonialEdit = i => document.getElementById(`testim-edit-${i}`).classList.toggle('hidden');
window.renderTestimonialTitle = (i, val) => {
  const el = document.querySelector(`#testim-edit-${i}`)?.closest('.bg-white')?.querySelector('.text-navy-brand');
  if (el) el.textContent = val || 'Sem nome';
};
window.addTestimonial = () => { localTestimonials.push({name:'',role:'Paciente',image:'',text:''}); renderTestimonials(); };
window.removeTestimonial = i => { if(!confirm('Remover depoimento?')) return; localTestimonials.splice(i,1); renderTestimonials(); };
window.saveTestimonials = async () => { await setDoc(doc(db,'content','testimonials'),{items:localTestimonials}); showToast('Depoimentos salvos!'); };


// ── PROMO CARD ────────────────────────────────────────
let promoImgFile = null;
async function loadPromoCard() {
  try {
    const snap = await getDoc(doc(db,'content','promo_card'));
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.title) document.getElementById('promo-title').value = d.title;
    if (d.link)  document.getElementById('promo-link').value  = d.link;
    if (d.active !== undefined) document.getElementById('promo-active').checked = d.active;
    if (d.imageUrl) {
      const el = document.getElementById('promo-img-preview');
      el.style.backgroundImage = `url('${d.imageUrl}')`;
      el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center';
      el.innerHTML = '';
    }
  } catch {}
}

window.handlePromoImg = input => {
  const file = input.files[0]; if (!file) return;
  input.value = '';
  // Promo card ratio: 3:1 (wide banner)
  openCropModal(file, 3/1, async croppedFile => {
    promoImgFile = croppedFile;
    const reader = new FileReader();
    reader.onload = e => {
      const el = document.getElementById('promo-img-preview');
      el.style.backgroundImage = `url('${e.target.result}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.innerHTML = '';
    };
    reader.readAsDataURL(croppedFile);
    await savePromoCard();
  });
};

window.savePromoCard = async () => {
  const title  = document.getElementById('promo-title').value.trim();
  const link   = document.getElementById('promo-link').value;
  const active = document.getElementById('promo-active').checked;
  let imageUrl = (await getDoc(doc(db,'content','promo_card'))).data()?.imageUrl || '';
  if (promoImgFile) {
    showToast('Enviando imagem...');
    try {
      const storageRef = sRef(storage, `promo/card_${Date.now()}_${promoImgFile.name}`);
      await uploadBytes(storageRef, promoImgFile);
      imageUrl = await getDownloadURL(storageRef);
      promoImgFile = null;
    } catch (e) { showToast('Erro no upload da imagem.'); return; }
  }
  await setDoc(doc(db,'content','promo_card'), { title, link, active, imageUrl });
  showToast('Card promocional salvo!');
};

// ── AVAILABILITY ─────────────────────────────────────
const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
let selectedDays  = [1,2,3,4,5];
let blockedDates  = [];
let blockYear, blockMonth;

async function loadAvailability() {
  const now = new Date(); blockYear = now.getFullYear(); blockMonth = now.getMonth();
  try {
    const snap = await getDoc(doc(db,'content','availability'));
    if (snap.exists()) {
      const d = snap.data();
      selectedDays  = d.days     || [1,2,3,4,5];
      blockedDates  = d.blocked  || [];
      if (d.start)    document.getElementById('av-start').value    = d.start;
      if (d.end)      document.getElementById('av-end').value      = d.end;
      if (d.interval) document.getElementById('av-interval').value = d.interval;
      if (d.lunchEnabled) {
        document.getElementById('av-lunch-enabled').checked = true;
        document.getElementById('lunch-fields').classList.remove('hidden');
        if (d.lunchStart) document.getElementById('av-lunch-start').value = d.lunchStart;
        if (d.lunchEnd)   document.getElementById('av-lunch-end').value   = d.lunchEnd;
      }
    }
  } catch {}
  renderDays(); buildBlockCalendar();
  document.getElementById('blocked-count').textContent = blockedDates.length;
}

function renderDays() {
  document.getElementById('days-checkboxes').innerHTML = DAY_LABELS.map((label, i) => `
    <label class="flex items-center gap-2 cursor-pointer select-none bg-stone-neutral border border-rose-light/30 rounded-xl px-3 py-2 hover:border-rose-gold transition-colors">
      <input type="checkbox" value="${i}" ${selectedDays.includes(i)?'checked':''}
        onchange="toggleDay(${i},this.checked)" class="w-4 h-4 accent-rose-gold"/>
      <span class="text-sm font-bold">${label}</span>
    </label>`).join('');
}
window.toggleDay = (day, checked) => { selectedDays = checked ? [...new Set([...selectedDays,day])] : selectedDays.filter(d=>d!==day); };
window.toggleLunch = checked => { document.getElementById('lunch-fields').classList.toggle('hidden',!checked); };

window.saveAvailability = async () => {
  const lunchEnabled = document.getElementById('av-lunch-enabled').checked;
  await setDoc(doc(db,'content','availability'), {
    days: selectedDays,
    start: document.getElementById('av-start').value,
    end:   document.getElementById('av-end').value,
    interval: parseInt(document.getElementById('av-interval').value),
    lunchEnabled,
    lunchStart: lunchEnabled ? document.getElementById('av-lunch-start').value : null,
    lunchEnd:   lunchEnabled ? document.getElementById('av-lunch-end').value   : null,
    blocked: blockedDates,
  });
  showToast('Disponibilidade salva!');
};

// Calendário de datas bloqueadas
function buildBlockCalendar() {
  const title = document.getElementById('block-cal-title');
  const grid  = document.getElementById('block-cal-grid');
  const today = new Date(); today.setHours(0,0,0,0);
  title.textContent = `${MONTHS_PT[blockMonth]} ${blockYear}`;
  const firstDay    = new Date(blockYear, blockMonth, 1).getDay();
  const daysInMonth = new Date(blockYear, blockMonth+1, 0).getDate();
  let html = '';
  for (let i=0;i<firstDay;i++) html += '<div class="cal-day empty h-8"></div>';
  for (let d=1;d<=daysInMonth;d++) {
    const date    = new Date(blockYear, blockMonth, d);
    const dateStr = `${blockYear}-${String(blockMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast  = date < today;
    const isBlocked = blockedDates.includes(dateStr);
    html += `<div onclick="${isPast?'':` toggleBlockDate('${dateStr}')`}"
      class="cal-day h-8 flex items-center justify-center text-xs font-semibold ${isPast?'past':''} ${isBlocked?'blocked':''}">${d}</div>`;
  }
  grid.innerHTML = html;
}

window.toggleBlockDate = dateStr => {
  if (blockedDates.includes(dateStr)) { blockedDates = blockedDates.filter(d=>d!==dateStr); }
  else { blockedDates.push(dateStr); }
  document.getElementById('blocked-count').textContent = blockedDates.length;
  buildBlockCalendar();
};
window.prevBlockMonth = () => { blockMonth--; if(blockMonth<0){blockMonth=11;blockYear--;} buildBlockCalendar(); };
window.nextBlockMonth = () => { blockMonth++; if(blockMonth>11){blockMonth=0;blockYear++;} buildBlockCalendar(); };

window.saveBlockedDates = async () => {
  const snap = await getDoc(doc(db,'content','availability'));
  const existing = snap.exists() ? snap.data() : {};
  await setDoc(doc(db,'content','availability'), { ...existing, blocked: blockedDates }, { merge:true });
  showToast(`${blockedDates.length} datas bloqueadas salvas!`);
};

// ── CLIENTS & ANAMNESE ───────────────────────────────
const SINTOMAS_LIST = [
  // Sistema Geral
  'Fadiga / Cansaço excessivo','Fraqueza generalizada','Febre recorrente','Calafrios',
  'Sudorese noturna','Perda de peso involuntária','Ganho de peso involuntário','Edema / Inchaço generalizado',
  // Sistema Neurológico
  'Cefaleia frequente','Enxaqueca','Tontura / Vertigem','Desmaio / Síncope',
  'Tremores','Formigamento / Dormência','Convulsões','Dificuldade de concentração',
  'Perda de memória','Distúrbios do sono',
  // Sistema Cardiovascular
  'Palpitações','Dor ou pressão no peito','Falta de ar ao esforço',
  'Falta de ar em repouso','Inchaço em membros inferiores','Varizes',
  // Sistema Respiratório
  'Tosse seca','Tosse com catarro','Chiado no peito (sibilos)',
  'Epistaxe (sangramento nasal)','Ronco / Apneia do sono',
  // Sistema Digestivo
  'Náuseas','Vômitos','Diarreia','Constipação (prisão de ventre)',
  'Distensão abdominal','Flatulência excessiva','Refluxo / Azia / Queimação',
  'Disfagia (dificuldade de engolir)','Dor abdominal',
  // Sistema Urinário
  'Polaciúria (urinação frequente)','Urgência miccional','Disúria (ardência ao urinar)',
  'Incontinência urinária','Hematúria (sangue na urina)',
  // Sistema Reprodutor
  'Irregularidade menstrual','Dismenorreia (cólicas intensas)','Fluxo menstrual aumentado',
  'TPM intensa','Sintomas de menopausa / climatério','Libido baixa',
  'Ressecamento vaginal','Disfunção erétil',
  // Sistema Musculoesquelético
  'Mialgia (dores musculares)','Artralgia (dores articulares)','Artrite / Inflamação articular',
  'Rigidez matinal','Câimbras','Fraqueza muscular',
  // Pele e Fâneros
  'Queda de cabelo (alopecia)','Acne / Espinhas','Manchas na pele',
  'Pele ressecada','Prurido (coceira)','Unhas quebradiças',
  'Urticária / Reações alérgicas de pele',
  // Endócrino / Metabólico
  'Intolerância ao frio','Intolerância ao calor','Sede excessiva (polidipsia)',
  'Fome excessiva','Hipoglicemia','Sudorese excessiva',
  // Saúde Mental
  'Ansiedade','Depressão / Tristeza persistente','Irritabilidade / Mudanças de humor',
  'Estresse crônico','Síndrome do pânico',
  // Outros
  'Intolerâncias alimentares','Retenção hídrica',
  'Visão turva / Alterações visuais','Zumbido no ouvido (tinnitus)','Halitose',
];

let clientsData    = [];
let currentClientUid = null;
let anamneseData   = {};

async function loadClients() {
  const list = document.getElementById('clients-list');
  if (!list) return;
  try {
    const snapUsers = await getDocs(collection(db, 'users'));
    const usersData = snapUsers.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.name || u.email);
    
    let manualClientes = [];
    try {
      const snapClientes = await getDocs(collection(db, 'clientes'));
      manualClientes = snapClientes.docs.map(d => ({ uid: d.id, ...d.data(), isManual: true })).filter(u => u.name);
    } catch(e) { console.warn("Coleção clientes vazia ou inacessível."); }

    clientsData = [...usersData, ...manualClientes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    
    const countEl = document.getElementById('clients-count');
    if (countEl) countEl.textContent = `${clientsData.length} cadastrado${clientsData.length !== 1 ? 's' : ''}`;
    if (!clientsData.length) {
      list.innerHTML = '<div class="text-center py-16 text-warm-gray/30 text-sm">Nenhum cliente cadastrado ainda.</div>';
      return;
    }
    renderClientsList(clientsData);
  } catch {
    list.innerHTML = '<div class="text-center py-16 text-warm-gray/30 text-sm">Erro ao carregar clientes.</div>';
  }
}

window.renderClientsList = (data) => {
  const list = document.getElementById('clients-list');
  if (!data.length) { list.innerHTML = '<div class="text-center py-16 text-warm-gray/30 text-sm">Nenhum cliente encontrado.</div>'; return; }
  list.innerHTML = data.map(u => {
    const idx = clientsData.findIndex(c => c.uid === u.uid);
    return `
      <div onclick="openClientProfile(${idx})"
        class="bg-white rounded-2xl p-4 shadow-sm border border-rose-light/20 flex items-center gap-4 hover:border-rose-gold/50 hover:shadow-md transition-all cursor-pointer">
        <div class="w-10 h-10 rounded-full bg-rose-light/30 flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-rose-gold text-xl">person</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-navy-brand truncate">${u.name || '—'} ${u.isManual ? '<span class="text-[9px] bg-stone-neutral px-1.5 py-0.5 rounded text-warm-gray/50 ml-1">Manual</span>' : ''}</p>
          <p class="text-xs text-warm-gray/50 mt-0.5">${u.phone ? u.phone + (u.email ? ' · ' + u.email : '') : (u.email || '—')}</p>
        </div>
        ${u.isManual ? `
          <button onclick="event.stopPropagation(); editManualClient('${u.uid}')" class="text-warm-gray/30 hover:text-rose-gold p-1.5 transition-colors cursor-pointer" title="Editar"><span class="material-symbols-outlined text-lg">edit</span></button>
        ` : ''}
        <button onclick="event.stopPropagation(); deleteClient('${u.uid}')" class="text-warm-gray/30 hover:text-red-400 p-1.5 transition-colors cursor-pointer" title="Excluir"><span class="material-symbols-outlined text-lg">delete</span></button>
        <span class="material-symbols-outlined text-warm-gray/25 text-base flex-shrink-0 ml-1">chevron_right</span>
      </div>`;
  }).join('');
};

window.filterClients = () => {
  const q = document.getElementById('client-search').value.toLowerCase();
  const filtered = clientsData.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  renderClientsList(filtered);
};

window.openNewClientModal = () => {
  document.getElementById('nc-id').value = '';
  document.getElementById('nc-name').value = '';
  document.getElementById('nc-phone').value = '';
  document.getElementById('nc-title').textContent = 'Novo Cliente';
  document.getElementById('nc-btn').textContent = 'Cadastrar';
  document.getElementById('new-client-modal').classList.remove('hidden');
};

window.editManualClient = uid => {
  const u = clientsData.find(c => c.uid === uid);
  if (!u) return;
  document.getElementById('nc-id').value = u.uid;
  document.getElementById('nc-name').value = u.name || '';
  document.getElementById('nc-phone').value = u.phone || '';
  document.getElementById('nc-title').textContent = 'Editar Cliente';
  document.getElementById('nc-btn').textContent = 'Salvar Alterações';
  document.getElementById('new-client-modal').classList.remove('hidden');
};

window.deleteManualClient = async uid => {
  if (!confirm('Tem certeza que deseja excluir este cliente? Toda a ficha de anamnese também será perdida.')) return;
  try {
    await deleteDoc(doc(db, 'clientes', uid));
    await deleteDoc(doc(db, 'anamnese', uid));
    showToast('Cliente excluído!');
    loadClients();
  } catch(e) {
    showToast('Erro ao excluir.');
    console.error(e);
  }
};
window.deleteClient = async uid => {
  if (!confirm('Tem certeza que deseja excluir este cliente? Todos os dados (perfil, anamnese e agendamentos) serão removidos permanentemente.')) return;
  try {
    // Excluir de todas as coleções possíveis
    const deletions = [
      deleteDoc(doc(db, 'users', uid)).catch(() => {}),
      deleteDoc(doc(db, 'clientes', uid)).catch(() => {}),
      deleteDoc(doc(db, 'anamnese', uid)).catch(() => {}),
    ];
    // Excluir agendamentos vinculados
    try {
      const apptSnap = await getDocs(query(collection(db,'appointments'), where('userId','==',uid)));
      apptSnap.docs.forEach(d => deletions.push(deleteDoc(doc(db,'appointments',d.id))));
      const apptSnap2 = await getDocs(query(collection(db,'appointments'), where('clientId','==',uid)));
      apptSnap2.docs.forEach(d => deletions.push(deleteDoc(doc(db,'appointments',d.id))));
    } catch {}
    await Promise.all(deletions);
    showToast('Cliente excluído com sucesso!');
    loadClients();
  } catch(e) {
    showToast('Erro ao excluir.');
    console.error(e);
  }
};

window.closeNewClientModal = () => {
  document.getElementById('new-client-modal').classList.add('hidden');
};

window.saveNewClient = async () => {
  const uid = document.getElementById('nc-id').value;
  const name = document.getElementById('nc-name').value.trim();
  const phone = document.getElementById('nc-phone').value.trim();
  if (!name || !phone) { showToast('Preencha nome e telefone.'); return; }
  const btn = document.getElementById('nc-btn');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  try {
    if (uid) {
      await updateDoc(doc(db, 'clientes', uid), { name, phone });
      showToast('Cliente atualizado!');
    } else {
      await addDoc(collection(db, 'clientes'), { name, phone, createdAt: serverTimestamp() });
      showToast('Cliente cadastrado!');
    }
    closeNewClientModal();
    loadClients();
  } catch (e) {
    showToast('Erro ao salvar cliente. Verifique permissões.');
    console.error(e);
  }
  btn.disabled = false;
};

window.openClientProfile = async idx => {
  const u = clientsData[idx];
  if (!u) return;
  currentClientUid = u.uid;
  anamneseData     = {};

  document.getElementById('clients-list-view').classList.add('hidden');
  document.getElementById('clients-profile-view').classList.remove('hidden');
  document.getElementById('client-name-display').textContent  = u.name  || '—';
  document.getElementById('client-phone-display').textContent = u.phone || '';
  document.getElementById('client-email-display').textContent = u.email || '';

  // Fechar anamnese por padrão ao abrir perfil
  document.getElementById('anamnese-content').classList.add('hidden');
  document.getElementById('anamnese-chevron').style.transform = 'rotate(0deg)';

  try {
    const snap = await getDoc(doc(db, 'anamnese', u.uid));
    if (snap.exists()) anamneseData = snap.data();
  } catch {}

  renderAnamneseForm();
};

window.toggleAnamnese = () => {
  const content = document.getElementById('anamnese-content');
  const chevron = document.getElementById('anamnese-chevron');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
};

window.openAdminBookingModal = () => {
  if (!currentClientUid) return;
  const cName = document.getElementById('client-name-display').textContent;
  document.getElementById('abm-client-name').textContent = cName;
  
  const sel = document.getElementById('abm-service');
  sel.innerHTML = '<option value="">Selecione...</option>' + allSvcs.filter(s => s.active).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  
  document.getElementById('abm-date').value = '';
  document.getElementById('abm-time').value = '';
  
  document.getElementById('admin-booking-modal').classList.remove('hidden');
};

window.closeAdminBookingModal = () => document.getElementById('admin-booking-modal').classList.add('hidden');

window.saveAdminBooking = async () => {
  const svc = document.getElementById('abm-service').value;
  const dat = document.getElementById('abm-date').value;
  const tim = document.getElementById('abm-time').value;
  
  if (!svc || !dat || !tim) { showToast('Preencha todos os campos'); return; }
  
  const parts = dat.split('-');
  const dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
  
  const btn = document.getElementById('abm-btn');
  btn.textContent = 'Agendando...'; btn.disabled = true;
  
  try {
    // Validar duplo agendamento (filtro client-side)
    const snap = await getDocs(query(collection(db,'appointments'), where('date','==',dateStr), where('time','==',tim)));
    const activeAppts = snap.docs.filter(dc => dc.data().status !== 'cancelled');
    if (activeAppts.length > 0) {
      showToast('Oops! Este horário já está ocupado. Por favor, escolha outro.');
      btn.textContent = 'Agendar'; btn.disabled = false;
      return;
    }

    const u = clientsData.find(c => c.uid === currentClientUid) || {};
    await addDoc(collection(db, 'appointments'), {
      clientId: currentClientUid,
      clientName: u.name || 'Desconhecido',
      email: u.email || '',
      phone: u.phone || '',
      serviceName: svc,
      date: dateStr,
      time: tim,
      status: 'confirmed',
      createdAt: serverTimestamp()
    });
    showToast('Horário agendado com sucesso!');
    closeAdminBookingModal();
  } catch(e) {
    showToast('Erro ao agendar.');
    console.error(e);
  }
  btn.textContent = 'Agendar'; btn.disabled = false;
};

window.backToClients = () => {
  document.getElementById('clients-profile-view').classList.add('hidden');
  document.getElementById('clients-list-view').classList.remove('hidden');
  currentClientUid = null;
};

function renderAnamneseForm() {
  const d = anamneseData;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('an-nome', d.nome); set('an-nascimento', d.dataNascimento); set('an-idade', d.idade);
  set('an-sexo', d.sexo); set('an-tipo-sanguineo', d.tipoSanguineo); set('an-estado-civil', d.estadoCivil);
  set('an-naturalidade', d.naturalidade); set('an-escolaridade', d.escolaridade); set('an-profissao', d.profissao);
  set('an-endereco', d.endereco); set('an-telefone', d.telefone); set('an-email', d.email);
  set('an-encaminhado', d.encaminhado); set('an-queixa-principal', d.queixaPrincipal);
  set('an-doenca-base', d.doencaBase); set('an-complicacoes', d.complicacoes);
  set('an-saneamento', d.saneamento); set('an-mobilidade', d.mobilidade);
  set('an-insonia', d.insonia); set('an-etilismo', d.etilismo);
  set('an-tabagismo', d.tabagismo); set('an-tabagismo-qtd', d.tabagismoQtd);
  set('an-incontinencias', d.incontinencias); set('an-sonda-fralda', d.sondaFralda);
  set('an-quimicos', d.quimicos); set('an-atividade-fisica', d.atividadeFisica);
  set('an-antec-mae', d.antecMae); set('an-antec-pai', d.antecPai);
  set('an-antec-infancia', d.antecInfancia); set('an-antec-adulto', d.antecAdulto);
  set('an-cirurgias', d.cirurgias); set('an-acidentes', d.acidentes); set('an-intoxicacoes', d.intoxicacoes);
  set('an-vacinas', d.vacinas); set('an-filhos', d.filhos);
  set('an-alergias-detalhe', d.alergias_detalhe); set('an-tratamentos-anteriores', d.tratamentosAnteriores);
  document.querySelectorAll('#alergias-checks input[type="checkbox"]').forEach(cb => {
    cb.checked = (d.alergias || []).includes(cb.dataset.alergia);
  });
  set('an-med-alop', d.medAlop); set('an-med-fito', d.medFito);
  set('an-med-chas', d.medChas); set('an-med-suplementos', d.medSuplementos);
  set('an-peso', d.peso); set('an-altura', d.altura);
  set('an-pa', d.pa); set('an-fc', d.fc); set('an-temperatura', d.temperatura); set('an-pulsos', d.pulsos);
  set('an-cintura', d.cintura); set('an-panturrilha-mid', d.panturrilhaMid);
  set('an-panturrilha-mie', d.panturrilhaMie); set('an-tornozelo-mid', d.tornozeloMid);
  set('an-tornozelo-mie', d.tornozeloMie);
  set('an-exame-clinico', d.exameClinIco); set('an-exame-cardio', d.exameCardio);
  set('an-exame-abdominal', d.exameAbdominal); set('an-exame-pulmonar', d.examePulmonar);
  const ex = d.exames || {};
  set('an-exames-data', ex.data); set('an-lab-g6pd', ex.g6pd); set('an-lab-glicose', ex.glicose);
  set('an-lab-hg-glicada', ex.hgGlicada); set('an-lab-hemograma', ex.hemograma);
  set('an-lab-ggt', ex.ggt); set('an-lab-tgo', ex.tgo); set('an-lab-tgp', ex.tgp);
  set('an-lab-tsh', ex.tsh); set('an-lab-t4l', ex.t4l); set('an-lab-t3l', ex.t3l);
  set('an-lab-vitb12', ex.vitb12); set('an-lab-ferritina', ex.ferritina);
  set('an-lab-ferro-serico', ex.ferroSerico); set('an-lab-vitd', ex.vitd);
  set('an-lab-proteinas', ex.proteinas); set('an-lab-pcrus', ex.pcrus);
  set('an-lab-ddimero', ex.ddimero); set('an-lab-inr', ex.inr); set('an-exames-obs', ex.obs);
  set('an-conclusao', d.conclusao); set('an-protocolo', d.protocolo);
  set('an-dose-total', d.doseTotal); set('an-evolucao', d.evolucao);
  const sc = document.getElementById('sintomas-count');
  if (sc) sc.textContent = (d.sintomas || []).length;
  calcIMC();
  renderSintomas();
}

window.calcIMC = () => {
  const peso   = parseFloat(document.getElementById('an-peso')?.value);
  const altura = parseFloat(document.getElementById('an-altura')?.value);
  const imcEl  = document.getElementById('an-imc');
  const clsEl  = document.getElementById('an-imc-class');
  if (!imcEl) return;
  if (!peso || !altura || altura < 50) { imcEl.textContent = '—'; if (clsEl) clsEl.textContent = ''; return; }
  const h   = altura / 100;
  const imc = peso / (h * h);
  imcEl.textContent = imc.toFixed(1);
  let cls;
  if      (imc < 18.5) cls = 'Abaixo do peso';
  else if (imc < 25)   cls = 'Peso normal';
  else if (imc < 30)   cls = 'Sobrepeso';
  else if (imc < 35)   cls = 'Obesidade grau I';
  else if (imc < 40)   cls = 'Obesidade grau II';
  else                  cls = 'Obesidade grau III';
  clsEl.textContent = cls;
};

function renderSintomas() {
  const el  = document.getElementById('sintomas-tags');
  const sel = anamneseData.sintomas || [];
  if (!el) return;
  el.innerHTML = sel.length
    ? sel.map(s => `<span class="bg-rose-light/40 text-deep-rose text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">${s}</span>`).join('')
    : '<span class="text-xs text-warm-gray/30 italic">Nenhum selecionado</span>';
}

window.openSymptomsModal = () => {
  const sel = anamneseData.sintomas || [];
  document.getElementById('symptoms-modal').classList.remove('hidden');
  document.getElementById('symptoms-grid').innerHTML = SINTOMAS_LIST.map(s => `
    <label class="flex items-center gap-3 cursor-pointer select-none px-3 py-2.5 rounded-xl hover:bg-stone-neutral transition-colors">
      <input type="checkbox" data-sym="${s}" ${sel.includes(s) ? 'checked' : ''}
        onchange="toggleSintoma(this.dataset.sym, this.checked)"
        class="w-4 h-4 accent-rose-gold flex-shrink-0"/>
      <span class="text-sm font-medium">${s}</span>
    </label>`).join('');
};

window.closeSymptomsModal = () => {
  document.getElementById('symptoms-modal').classList.add('hidden');
  renderSintomas();
};

window.toggleSintoma = (s, checked) => {
  if (!anamneseData.sintomas) anamneseData.sintomas = [];
  if (checked) { if (!anamneseData.sintomas.includes(s)) anamneseData.sintomas.push(s); }
  else         { anamneseData.sintomas = anamneseData.sintomas.filter(x => x !== s); }
  const el = document.getElementById('sintomas-count');
  if (el) el.textContent = anamneseData.sintomas.length;
};

window.toggleAlergia = (alergia, checked) => {
  if (!anamneseData.alergias) anamneseData.alergias = [];
  if (checked) { if (!anamneseData.alergias.includes(alergia)) anamneseData.alergias.push(alergia); }
  else         { anamneseData.alergias = anamneseData.alergias.filter(a => a !== alergia); }
};

window.saveAnamnese = async () => {
  if (!currentClientUid) return;
  const btn = document.getElementById('save-anamnese-btn');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  const gv = id => (document.getElementById(id)?.value || '').trim();
  try {
    const data = {
      ...anamneseData,
      nome: gv('an-nome'), dataNascimento: gv('an-nascimento'), idade: gv('an-idade'),
      sexo: gv('an-sexo'), tipoSanguineo: gv('an-tipo-sanguineo'), estadoCivil: gv('an-estado-civil'),
      naturalidade: gv('an-naturalidade'), escolaridade: gv('an-escolaridade'), profissao: gv('an-profissao'),
      endereco: gv('an-endereco'), telefone: gv('an-telefone'), email: gv('an-email'),
      encaminhado: gv('an-encaminhado'), queixaPrincipal: gv('an-queixa-principal'),
      doencaBase: gv('an-doenca-base'), complicacoes: gv('an-complicacoes'),
      saneamento: gv('an-saneamento'), mobilidade: gv('an-mobilidade'),
      insonia: gv('an-insonia'), etilismo: gv('an-etilismo'),
      tabagismo: gv('an-tabagismo'), tabagismoQtd: gv('an-tabagismo-qtd'),
      incontinencias: gv('an-incontinencias'), sondaFralda: gv('an-sonda-fralda'),
      quimicos: gv('an-quimicos'), atividadeFisica: gv('an-atividade-fisica'),
      antecMae: gv('an-antec-mae'), antecPai: gv('an-antec-pai'),
      antecInfancia: gv('an-antec-infancia'), antecAdulto: gv('an-antec-adulto'),
      cirurgias: gv('an-cirurgias'), acidentes: gv('an-acidentes'), intoxicacoes: gv('an-intoxicacoes'),
      vacinas: gv('an-vacinas'), filhos: gv('an-filhos'),
      alergias: anamneseData.alergias || [], alergias_detalhe: gv('an-alergias-detalhe'),
      tratamentosAnteriores: gv('an-tratamentos-anteriores'),
      medAlop: gv('an-med-alop'), medFito: gv('an-med-fito'),
      medChas: gv('an-med-chas'), medSuplementos: gv('an-med-suplementos'),
      peso: parseFloat(gv('an-peso')) || null, altura: parseFloat(gv('an-altura')) || null,
      pa: gv('an-pa'), fc: gv('an-fc'), temperatura: gv('an-temperatura'), pulsos: gv('an-pulsos'),
      cintura: gv('an-cintura'), panturrilhaMid: gv('an-panturrilha-mid'),
      panturrilhaMie: gv('an-panturrilha-mie'), tornozeloMid: gv('an-tornozelo-mid'),
      tornozeloMie: gv('an-tornozelo-mie'),
      exameClinIco: gv('an-exame-clinico'), exameCardio: gv('an-exame-cardio'),
      exameAbdominal: gv('an-exame-abdominal'), examePulmonar: gv('an-exame-pulmonar'),
      exames: {
        data: gv('an-exames-data'), g6pd: gv('an-lab-g6pd'), glicose: gv('an-lab-glicose'),
        hgGlicada: gv('an-lab-hg-glicada'), hemograma: gv('an-lab-hemograma'),
        ggt: gv('an-lab-ggt'), tgo: gv('an-lab-tgo'), tgp: gv('an-lab-tgp'),
        tsh: gv('an-lab-tsh'), t4l: gv('an-lab-t4l'), t3l: gv('an-lab-t3l'),
        vitb12: gv('an-lab-vitb12'), ferritina: gv('an-lab-ferritina'),
        ferroSerico: gv('an-lab-ferro-serico'), vitd: gv('an-lab-vitd'),
        proteinas: gv('an-lab-proteinas'), pcrus: gv('an-lab-pcrus'),
        ddimero: gv('an-lab-ddimero'), inr: gv('an-lab-inr'), obs: gv('an-exames-obs'),
      },
      conclusao: gv('an-conclusao'), protocolo: gv('an-protocolo'),
      doseTotal: gv('an-dose-total'), evolucao: gv('an-evolucao'),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'anamnese', currentClientUid), data, { merge: true });
    anamneseData = { ...anamneseData, ...data };
    showToast('Ficha salva com sucesso!');
  } catch (e) {
    showToast('Erro ao salvar. Verifique as regras do Firestore.');
    console.error(e);
  }
  btn.textContent = 'Salvar ficha'; btn.disabled = false;
};

window.exportAnamnese = () => {
  const d  = anamneseData;
  const g  = v => v || '—';
  const ex = d.exames || {};
  const clientName = document.getElementById('client-name-display')?.textContent || '—';
  const imc_val = (d.peso && d.altura) ? (d.peso / Math.pow(d.altura / 100, 2)).toFixed(1) : '—';
  const sintomas = d.sintomas || [];
  const alergias = d.alergias || [];

  const row = (label, value) => (value && value !== '—')
    ? '<tr><td style="padding:5px 10px;font-size:11px;color:#6B6364;font-weight:600;width:38%;border-bottom:1px solid #F0EBE8;vertical-align:top;">' + label + '</td>'
      + '<td style="padding:5px 10px;font-size:12px;color:#1D2D44;border-bottom:1px solid #F0EBE8;white-space:pre-wrap;">' + value + '</td></tr>'
    : '';

  const sec = (num, title, content) =>
    '<div style="margin-bottom:18px;break-inside:avoid;">'
    + '<div style="background:#1D2D44;color:#fff;padding:6px 12px;border-radius:8px 8px 0 0;font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">' + num + ' · ' + title + '</div>'
    + '<div style="border:1px solid #E5C1CD;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">'
    + '<table style="width:100%;border-collapse:collapse;">' + content + '</table></div></div>';

  const labContent =
    row('G6PD', ex.g6pd) + row('Glicose', ex.glicose) + row('Hg Glicada', ex.hgGlicada)
    + row('Hemograma', ex.hemograma) + row('GGT', ex.ggt) + row('TGO', ex.tgo)
    + row('TGP', ex.tgp) + row('TSH', ex.tsh) + row('T4 Livre', ex.t4l)
    + row('T3 Livre', ex.t3l) + row('Vit B12', ex.vitb12) + row('Ferritina', ex.ferritina)
    + row('Ferro Sérico', ex.ferroSerico) + row('25OH Vit D', ex.vitd)
    + row('Proteínas Totais', ex.proteinas) + row('PCRus', ex.pcrus)
    + row('D Dímero', ex.ddimero) + row('INR', ex.inr) + row('Outros / Obs.', ex.obs);

  const alergiasTxt = alergias.length
    ? alergias.join(', ') + (d.alergias_detalhe ? ' — ' + d.alergias_detalhe : '')
    : '';

  const html =
    '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"/>'
    + '<title>Ficha de Anamnese — ' + clientName + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>'
    + '<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Montserrat,sans-serif;background:#fff;color:#4A4546;font-size:12px;line-height:1.5;}'
    + '@media print{.no-print{display:none!important;}@page{margin:14mm 12mm;size:A4;}}'
    + '.no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999;}'
    + '.btn-print{background:#B76E79;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;}'
    + '.btn-close{background:#F5F2ED;color:#4A4546;border:1px solid #E5C1CD;padding:10px 16px;border-radius:10px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;cursor:pointer;}'
    + '</style></head><body>'
    + '<div class="no-print"><button class="btn-close" onclick="window.close()">Fechar</button>'
    + '<button class="btn-print" onclick="window.print()">&#128438; Imprimir / PDF</button></div>'
    + '<div style="max-width:760px;margin:0 auto;padding:28px 18px;">'
    // Header
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-bottom:14px;border-bottom:2.5px solid #B76E79;">'
    + '<div><div style="font-size:21px;font-weight:800;color:#1D2D44;letter-spacing:-.02em;">Instituto Bioflores</div>'
    + '<div style="font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#B76E79;margin-top:3px;">Dra. Laura Flores</div></div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#aaa;">Ficha de Anamnese</div>'
    + '<div style="font-size:14px;font-weight:800;color:#1D2D44;margin-top:2px;">' + clientName + '</div>'
    + '<div style="font-size:10px;color:#aaa;margin-top:2px;">Emitido em ' + new Date().toLocaleDateString('pt-BR') + '</div>'
    + '</div></div>'
    // Sections
    + sec('01','Identificação',
        row('Nome', g(d.nome)) + row('Data de Nascimento', g(d.dataNascimento)) + row('Idade', g(d.idade))
        + row('Sexo', g(d.sexo)) + row('Tipo Sanguíneo', g(d.tipoSanguineo)) + row('Estado Civil', g(d.estadoCivil))
        + row('Naturalidade', g(d.naturalidade)) + row('Escolaridade', g(d.escolaridade)) + row('Profissão', g(d.profissao))
        + row('Endereço', g(d.endereco)) + row('Telefone', g(d.telefone)) + row('E-mail', g(d.email))
        + row('Encaminhado por', g(d.encaminhado)))
    + sec('02','Queixa Principal e Histórico',
        row('Queixa principal', g(d.queixaPrincipal)) + row('Doença de base', g(d.doencaBase))
        + row('Complicações', g(d.complicacoes)) + row('Saneamento básico', g(d.saneamento))
        + row('Mobilidade', g(d.mobilidade)) + row('Insônia', g(d.insonia))
        + row('Etilismo', g(d.etilismo)) + row('Tabagismo', g(d.tabagismo))
        + row('Qtd. cigarro/dia', g(d.tabagismoQtd)) + row('Incontinências', g(d.incontinencias))
        + row('Uso de Sonda/Fralda', g(d.sondaFralda)) + row('Substâncias químicas', g(d.quimicos))
        + row('Atividade física', g(d.atividadeFisica)))
    + sec('03','Antecedentes',
        row('Antec. Familiar — Mãe', g(d.antecMae)) + row('Antec. Familiar — Pai', g(d.antecPai))
        + row('Antec. Pessoal — Infância', g(d.antecInfancia)) + row('Antec. Pessoal — Adulto', g(d.antecAdulto))
        + row('Cirurgias', g(d.cirurgias)) + row('Acidentes / Traumas', g(d.acidentes))
        + row('Intoxicações', g(d.intoxicacoes)) + row('Vacinas', g(d.vacinas))
        + row('Filhos / Parto / Aborto', g(d.filhos))
        + row('Alergias', alergiasTxt || '—') + row('Tratamentos anteriores', g(d.tratamentosAnteriores)))
    + sec('04','Medicamentos e Suplementos',
        row('Alopáticos', g(d.medAlop)) + row('Fitoterápicos', g(d.medFito))
        + row('Chás', g(d.medChas)) + row('Suplementos', g(d.medSuplementos)))
    + sec('05','Checklist de Sintomas',
        '<tr><td colspan="2" style="padding:10px 12px;">'
        + (sintomas.length
          ? sintomas.map(s => '<span style="display:inline-block;background:#F2D8DC;color:#8E505A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin:2px 3px;letter-spacing:.04em;">' + s + '</span>').join('')
          : '<span style="color:#aaa;font-style:italic;font-size:11px;">Nenhum sintoma marcado</span>')
        + '</td></tr>')
    + sec('06','Dados Antropométricos e Vitais',
        row('Peso', d.peso ? d.peso + ' kg' : '—') + row('Altura', d.altura ? d.altura + ' cm' : '—')
        + row('IMC', imc_val) + row('PA', g(d.pa)) + row('FC', g(d.fc))
        + row('Temperatura', g(d.temperatura)) + row('Pulsos', g(d.pulsos))
        + row('Cintura', g(d.cintura)) + row('Panturrilha MID', g(d.panturrilhaMid))
        + row('Panturrilha MIE', g(d.panturrilhaMie)) + row('Tornozelo MID', g(d.tornozeloMid))
        + row('Tornozelo MIE', g(d.tornozeloMie)))
    + sec('07','Avaliação Clínica',
        row('Exame Clínico Geral', g(d.exameClinIco)) + row('Exame Cardiológico', g(d.exameCardio))
        + row('Exame Abdominal', g(d.exameAbdominal)) + row('Exame Pulmonar', g(d.examePulmonar)))
    + sec('08', 'Exames Laboratoriais' + (ex.data ? ' · ' + ex.data : ''), labContent || row('—','Sem exames registrados'))
    + sec('09','Conclusão Diagnóstica e Protocolo',
        row('Conclusão Diagnóstica', g(d.conclusao)) + row('Protocolo', g(d.protocolo))
        + row('Dose Total', g(d.doseTotal)))
    + sec('10','Evolução', row('Evolução', g(d.evolucao)))
    // Footer
    + '<div style="margin-top:30px;padding-top:14px;border-top:1px solid #E5C1CD;display:flex;justify-content:space-between;align-items:flex-end;">'
    + '<div style="font-size:9px;color:#aaa;letter-spacing:.08em;text-transform:uppercase;">Instituto Bioflores · Dra. Laura Flores</div>'
    + '<div style="text-align:center;">'
    + '<div style="border-top:1px solid #1D2D44;width:210px;margin-bottom:5px;"></div>'
    + '<div style="font-size:9px;color:#4A4546;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Assinatura / Carimbo</div>'
    + '</div></div>'
    + '</div></body></html>';

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else showToast('Permita pop-ups para exportar o documento.');
};

// ── IMAGE CROP ────────────────────────────────────────
let cropperInstance = null;
let _cropCallback   = null;

function openCropModal(file, aspectRatio, onConfirm) {
  _cropCallback = onConfirm;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('crop-img');
    img.src = e.target.result;
    document.getElementById('crop-modal').classList.remove('hidden');
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    cropperInstance = new Cropper(img, {
      aspectRatio,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.95,
      guides: true,
      background: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
    });
  };
  reader.readAsDataURL(file);
}

window.closeCropModal = () => {
  document.getElementById('crop-modal').classList.add('hidden');
  if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
  _cropCallback = null;
};

window.confirmCrop = () => {
  if (!cropperInstance || !_cropCallback) return;
  const cb = _cropCallback; // Salvar referência ANTES de fechar o modal
  const btn = document.getElementById('crop-confirm-btn');
  btn.textContent = 'Processando...'; btn.disabled = true;
  cropperInstance.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920, imageSmoothingQuality: 'high' })
    .toBlob(blob => {
      const file = new File([blob], 'imagem.jpg', { type: 'image/jpeg' });
      closeCropModal();
      btn.textContent = 'Confirmar'; btn.disabled = false;
      cb(file); // Usar referência salva
    }, 'image/jpeg', 0.92);
};

// ── TOAST ────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.opacity='1';
  setTimeout(()=>{ t.style.opacity='0'; }, 3000);
}

document.addEventListener('contextmenu',e=>e.preventDefault());
