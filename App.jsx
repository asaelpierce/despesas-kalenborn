import React, { useState, useEffect } from 'react';
import { 
  Receipt, CheckCircle, XCircle, Clock, Send, FileText, 
  Upload, AlertCircle, BarChart3, LogOut, User, Calendar, 
  DollarSign, MapPin, Lock, X, Eye, ExternalLink, Download, Archive, Menu,
  Edit3, Trash2, Users, UserPlus, AlertTriangle, Plane, Briefcase, ArrowLeft,
  CreditCard, Wallet, Search, History
} from 'lucide-react';

// --- CONFIGURAÇÃO DO SUPABASE (REST API) ---
const SUPABASE_URL = 'https://cltwklqhmxzztmzlhzkd.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_anOm60apjPykkJLY0wLh_A_imuIGaSu';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

const ENDPOINT_USERS = `${SUPABASE_URL}/rest/v1/users`;
const ENDPOINT_EXPENSES = `${SUPABASE_URL}/rest/v1/expenses`;
const ENDPOINT_TRIPS = `${SUPABASE_URL}/rest/v1/trips`;
const STORAGE_BUCKET = 'attachments';

const CATEGORIES = ['Alimentação', 'Hospedagem', 'Transporte', 'Combustível', 'Outros'];

const BRAZILIAN_CITIES = [
  'São Paulo - SP', 'Rio de Janeiro - RJ', 'Brasília - DF', 'Salvador - BA', 'Fortaleza - CE', 
  'Belo Horizonte - MG', 'Manaus - AM', 'Curitiba - PR', 'Recife - PE', 'Goiânia - GO', 
  'Belém - PA', 'Porto Alegre - RS', 'Guarulhos - SP', 'Campinas - SP', 'São Luís - MA', 
  'São Gonçalo - RJ', 'Maceió - AL', 'Duque de Caxias - RJ', 'Campo Grande - MS', 'Natal - RN', 
  'Teresina - PI', 'São Bernardo do Campo - SP', 'Nova Iguaçu - RJ', 'João Pessoa - PB', 
  'São José dos Campos - SP', 'Santo André - SP', 'Ribeirão Preto - SP', 'Jaboatão dos Guararapes - PE', 
  'Osasco - SP', 'Sorocaba - SP', 'Uberlândia - MG', 'Aracaju - SE', 'Feira de Santana - BA', 
  'Cuiabá - MT', 'Joinville - SC', 'Juiz de Fora - MG'
];

const STATUS_COLORS = {
  'Enviado': 'bg-blue-100 text-blue-800 border-blue-200',
  'Em aprovação': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Aprovado': 'bg-green-100 text-green-800 border-green-200',
  'Reprovado': 'bg-red-100 text-red-800 border-red-200',
  'Fechado': 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  
  const [activeTab, setActiveTab] = useState('minhas_despesas');
  const [attachmentToView, setAttachmentToView] = useState(null);
  const [systemMessage, setSystemMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [zippingState, setZippingState] = useState({ active: false, label: '' });
  
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); 

  const fetchData = async () => {
    try {
      const [resUsers, resExp, resTrips] = await Promise.all([
        fetch(`${ENDPOINT_USERS}?select=*`, { headers: HEADERS }),
        fetch(`${ENDPOINT_EXPENSES}?select=*&order=created_at.desc`, { headers: HEADERS }),
        fetch(`${ENDPOINT_TRIPS}?select=*&order=created_at.desc`, { headers: HEADERS })
      ]);
      
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resExp.ok) setExpenses(await resExp.json());
      if (resTrips.ok) setTrips(await resTrips.json());
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 15000); 
    return () => clearInterval(intervalId);
  }, []);

  const getComputedTripStatus = (trip) => {
    if (trip.status === 'Em Revisão' && trip.closed_at) {
      const closedTime = new Date(trip.closed_at).getTime();
      const now = Date.now();
      const hours48 = 48 * 60 * 60 * 1000;
      if (now - closedTime >= hours48) return 'Enviada';
    }
    return trip.status;
  };

  const handleLogin = (username, password) => {
    const user = users.find(u => (u.name || '').toLowerCase() === username.toLowerCase().trim());
    if (user && user.password === password.trim()) {
      setCurrentUser(user);
      setActiveTab(user.role === 'gestor' ? 'aprovacoes' : 'minhas_despesas');
      return true;
    }
    return false;
  };

  const handleAddUser = async (userData) => {
    setIsLoading(true);
    try {
      const newId = userData.name.toLowerCase().replace(/\s/g, '');
      const payload = { id: newId, name: userData.name, password: userData.password, role: userData.role };
      const res = await fetch(ENDPOINT_USERS, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { fetchData(); setSystemMessage({ title: 'Equipa', text: 'Membro adicionado!' }); }
    } finally { setIsLoading(false); }
  };

  const handleAddTrip = async (tripData) => {
    setIsLoading(true);
    try {
      const payload = {
        userId: currentUser.id, userName: currentUser.name,
        client: tripData.client, destination: tripData.destination,
        start_date: tripData.startDate, end_date: tripData.endDate,
        status: 'Aberta'
      };
      const res = await fetch(ENDPOINT_TRIPS, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { 
        fetchData(); 
        setActiveTab('viagens'); 
        setSystemMessage({ title: 'Sucesso', text: 'Viagem criada com sucesso!' }); 
      }
    } finally { setIsLoading(false); }
  };

  const handleCloseTrip = async (tripId, forceSend = false) => {
    setIsLoading(true);
    try {
      const payload = forceSend 
        ? { status: 'Enviada', closed_at: new Date().toISOString() }
        : { status: 'Em Revisão', closed_at: new Date().toISOString() };

      const res = await fetch(`${ENDPOINT_TRIPS}?id=eq.${tripId}`, { 
        method: 'PATCH', 
        headers: HEADERS, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) {
        setSystemMessage({ 
          title: forceSend ? 'Enviada!' : 'Viagem Concluída', 
          text: forceSend 
            ? 'A viagem foi enviada para aprovação do Ricardo.' 
            : 'Viagem em fase de revisão (48h). Pode ainda editar as despesas.' 
        });
        await fetchData();
        // Atualiza a viagem selecionada localmente
        const { data } = await (await fetch(`${ENDPOINT_TRIPS}?id=eq.${tripId}`, { headers: HEADERS })).json();
        if (data && data.length > 0) setSelectedTrip(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (formData, file) => {
    setIsLoading(true);
    try {
      let uniqueFileName = '';
      if (file) {
        uniqueFileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const filePath = `${currentUser.id}/${uniqueFileName}`;
        await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type },
          body: file
        });
      }

      const payload = {
        userId: currentUser.id, userName: currentUser.name, date: formData.date,
        description: formData.description, amount: parseFloat(formData.amount),
        category: formData.category, location: formData.location,
        receiptName: uniqueFileName, isRefundable: formData.isRefundable,
        tripId: formData.tripId || null, status: 'Enviado', month: formData.date.substring(0, 7)
      };

      const res = await fetch(ENDPOINT_EXPENSES, { method: 'POST', headers: { ...HEADERS, 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
      if (res.ok) { fetchData(); return true; }
    } finally { setIsLoading(false); }
  };

  const handleEditExpenseSave = async (id, updatedData) => {
    setIsLoading(true);
    const payload = {
      date: updatedData.date, description: updatedData.description,
      amount: parseFloat(updatedData.amount), category: updatedData.category,
      location: updatedData.location, isRefundable: updatedData.isRefundable,
      tripId: updatedData.tripId || null, month: updatedData.date.substring(0, 7)
    };
    await fetch(`${ENDPOINT_EXPENSES}?id=eq.${id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(payload) });
    setExpenseToEdit(null);
    fetchData();
    setIsLoading(false);
  };

  const executeDeletion = async () => {
    setIsLoading(true);
    if (itemToDelete.type === 'expense') await fetch(`${ENDPOINT_EXPENSES}?id=eq.${itemToDelete.id}`, { method: 'DELETE', headers: HEADERS });
    else if (itemToDelete.type === 'trip') {
      await fetch(`${ENDPOINT_EXPENSES}?tripId=eq.${itemToDelete.id}`, { method: 'DELETE', headers: HEADERS });
      await fetch(`${ENDPOINT_TRIPS}?id=eq.${itemToDelete.id}`, { method: 'DELETE', headers: HEADERS });
      setActiveTab('viagens');
    }
    else if (itemToDelete.type === 'user') await fetch(`${ENDPOINT_USERS}?id=eq.${itemToDelete.id}`, { method: 'DELETE', headers: HEADERS });
    fetchData();
    setItemToDelete(null);
    setIsLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    await fetch(`${ENDPOINT_EXPENSES}?id=eq.${id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ status: newStatus }) });
    fetchData(); 
  };

  const generateExcelBlob = (list) => {
    const headers = ['Vendedor', 'Data', 'Categoria', 'Valor (R$)', 'Reembolsável?', 'Descrição', 'Link'];
    const csvRows = list.map(exp => {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${exp.userId}/${exp.receiptName}`;
      return [`"${exp.userName}"`, `"${new Date(exp.date).toLocaleDateString('pt-BR')}"`, `"${exp.category}"`, `"${parseFloat(exp.amount).toFixed(2).replace('.', ',')}"`, `"${exp.isRefundable ? 'SIM' : 'NÃO'}"`, `"${exp.description}"`, `"${url}"`].join(';');
    });
    return new Blob(["\uFEFF" + headers.join(';') + '\n' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  };

  const handleDownloadExcel = (month) => {
    const approved = expenses.filter(e => e.month === month && (e.status === 'Aprovado' || e.status === 'Fechado'));
    if (approved.length === 0) return alert("Sem despesas aprovadas.");
    const blob = generateExcelBlob(approved);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Kalenborn_${month}.csv`;
    link.click();
  };

  const handleDownloadZip = async (month, sellerName = null) => {
    let approved = expenses.filter(e => e.month === month && (e.status === 'Aprovado' || e.status === 'Fechado'));
    if (sellerName) approved = approved.filter(e => e.userName === sellerName);
    if (approved.length === 0) return alert("Sem anexos aprovados.");
    setZippingState({ active: true, label: sellerName || 'GERAL' });
    try {
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = new JSZip();
      const excelBlob = generateExcelBlob(approved);
      zip.file(`Relatorio_${sellerName || 'Geral'}_${month}.csv`, excelBlob);
      let fileCount = 0;
      for (const exp of approved) {
        if (!exp.receiptName) continue;
        const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${exp.userId}/${exp.receiptName}`;
        try {
          const res = await fetch(fileUrl);
          if (res.ok) {
            const blob = await res.blob();
            const ext = exp.receiptName.split('.').pop() || 'pdf';
            const cleanName = `${exp.userName}_${exp.date}_R$${exp.amount}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            zip.file(`anexos/${cleanName}.${ext}`, blob);
            fileCount++;
          }
        } catch (e) {}
      }
      if (fileCount > 0 || approved.length > 0) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `Anexos_Kalenborn_${sellerName || 'GERAL'}_${month}.zip`;
        link.click();
      }
    } finally { setZippingState({ active: false, label: '' }); }
  };

  const expensesForManager = expenses.filter(e => {
    if (e.status !== 'Enviado') return false; 
    if (!e.tripId) return true; 
    const trip = trips.find(t => t.id === e.tripId);
    return trip && getComputedTripStatus(trip) === 'Enviada';
  });

  if (!currentUser) return <LoginScreen onLogin={handleLogin} isLoading={isLoadingUsers} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-800 text-left overflow-x-hidden">
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 bg-slate-800 rounded-lg mr-2"><Menu size={20} /></button>
          <Receipt className="text-blue-400" size={24} />
          <h1 className="font-black text-lg tracking-wide uppercase hidden xs:block">Kalenborn</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right leading-none">
            <div className="text-xs font-bold">{currentUser.name}</div>
            <div className="text-[9px] uppercase font-black text-blue-400">{currentUser.role}</div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg transition-all"><LogOut size={18} /></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block space-y-2 mb-4 md:mb-0 transition-all`}>
          <NavBtn active={activeTab === 'nova_viagem'} onClick={() => {setActiveTab('nova_viagem'); setIsMobileMenuOpen(false);}} icon={<Briefcase size={18}/>} label="Criar Viagem" />
          <NavBtn active={activeTab === 'nova'} onClick={() => {setActiveTab('nova'); setIsMobileMenuOpen(false);}} icon={<Receipt size={18}/>} label="Lançar Despesa" />
          <NavBtn active={activeTab === 'viagens'} onClick={() => {setActiveTab('viagens'); setIsMobileMenuOpen(false);}} icon={<Plane size={18}/>} label="Minhas Viagens" />
          <NavBtn active={activeTab === 'minhas_despesas'} onClick={() => {setActiveTab('minhas_despesas'); setIsMobileMenuOpen(false);}} icon={<FileText size={18}/>} label="Minhas Despesas" />
          {currentUser.role === 'gestor' && (
            <div className="pt-4 md:pt-6 border-t border-slate-200 mt-4 text-left">
              <div className="pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão</div>
              <div className="space-y-2">
                <NavBtn active={activeTab === 'aprovacoes'} onClick={() => {setActiveTab('aprovacoes'); setIsMobileMenuOpen(false);}} icon={<CheckCircle size={18}/>} label="Aprovações" badge={expensesForManager.length} />
                <NavBtn active={activeTab === 'historico_vendedores'} onClick={() => {setActiveTab('historico_vendedores'); setIsMobileMenuOpen(false);}} icon={<History size={18}/>} label="Vendedores" />
                <NavBtn active={activeTab === 'fechamento'} onClick={() => {setActiveTab('fechamento'); setIsMobileMenuOpen(false);}} icon={<BarChart3 size={18}/>} label="Fechamento" />
                <NavBtn active={activeTab === 'equipa'} onClick={() => {setActiveTab('equipa'); setIsMobileMenuOpen(false);}} icon={<Users size={18}/>} label="Equipa" />
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-3 text-left">
          {activeTab === 'nova_viagem' && <TripForm onSubmit={handleAddTrip} loading={isLoading} />}
          {activeTab === 'nova' && <ExpenseForm onSubmit={handleAddExpense} trips={trips.filter(t => t.userId === currentUser.id && getComputedTripStatus(t) !== 'Enviada')} loading={isLoading} />}
          {activeTab === 'minhas_despesas' && <ExpenseList data={expenses.filter(e => e.userId === currentUser.id)} isGestor={false} onViewAttachment={setAttachmentToView} onEditExpense={setExpenseToEdit} onDeleteExpense={(id) => setItemToDelete({ type: 'expense', id })} title="Minhas Despesas" />}
          {activeTab === 'aprovacoes' && <ExpenseList data={expensesForManager} isGestor={true} onUpdateStatus={handleUpdateStatus} onViewAttachment={setAttachmentToView} onEditExpense={setExpenseToEdit} onDeleteExpense={(id) => setItemToDelete({ type: 'expense', id })} showAll title="Aguardando Aprovação" />}
          {activeTab === 'viagens' && <TripsList trips={trips.filter(t => t.userId === currentUser.id)} expenses={expenses} getComputedTripStatus={getComputedTripStatus} onViewTrip={(trip) => { setSelectedTrip(trip); setActiveTab('detalhes_viagem'); }} />}
          {activeTab === 'detalhes_viagem' && selectedTrip && <TripDetailsView trip={selectedTrip} expenses={expenses.filter(e => e.tripId === selectedTrip.id)} getComputedTripStatus={getComputedTripStatus} onBack={() => setActiveTab('viagens')} onCloseTrip={handleCloseTrip} onDeleteTrip={() => setItemToDelete({ type: 'trip', id: selectedTrip.id })} onViewAttachment={setAttachmentToView} onEditExpense={setExpenseToEdit} onDeleteExpense={(id) => setItemToDelete({ type: 'expense', id })} loading={isLoading} />}
          
          {activeTab === 'historico_vendedores' && (
            <SellersIndividualView 
               users={users.filter(u => u.role === 'vendedor')} 
               expenses={expenses} 
               onViewAttachment={setAttachmentToView}
               onEditExpense={setExpenseToEdit}
               onDeleteExpense={(id) => setItemToDelete({ type: 'expense', id })}
               onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeTab === 'fechamento' && <MonthlyClosing expenses={expenses} onDownloadExcel={handleDownloadExcel} onDownloadZip={handleDownloadZip} zippingState={zippingState} />}
          {activeTab === 'equipa' && <TeamManagement users={users} onAddUser={handleAddUser} onDeleteUser={(id) => setItemToDelete({ type: 'user', id })} loading={isLoading} />}
        </div>
      </div>

      {attachmentToView && <AttachmentModal fileData={attachmentToView} onClose={() => setAttachmentToView(null)} />}
      {expenseToEdit && <EditExpenseModal expense={expenseToEdit} trips={trips.filter(t => t.userId === expenseToEdit.userId)} onSave={handleEditExpenseSave} onClose={() => setExpenseToEdit(null)} loading={isLoading} />}
      {itemToDelete && <ConfirmModal item={itemToDelete} onConfirm={executeDeletion} onClose={() => setItemToDelete(null)} loading={isLoading} />}
      {systemMessage && <MessageModal msg={systemMessage} onClose={() => setSystemMessage(null)} />}
    </div>
  );
}

// --- SUB-COMPONENTES ---

function SellersIndividualView({ users, expenses, onViewAttachment, onEditExpense, onDeleteExpense, onUpdateStatus }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const sellerExpenses = expenses.filter(e => e.userId === selectedUserId);
  const totalRef = sellerExpenses.filter(e => e.isRefundable && e.status !== 'Reprovado').reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const totalCorp = sellerExpenses.filter(e => !e.isRefundable && e.status !== 'Reprovado').reduce((acc, e) => acc + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl"><User className="text-blue-600" size={28}/></div>
          <div><h2 className="font-black text-xl text-slate-800 tracking-tight">Vendedor Individual</h2><p className="text-slate-400 text-xs font-medium">Histórico de lançamentos.</p></div>
        </div>
        <select className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">-- Escolher Vendedor --</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {selectedUserId ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex items-center justify-between"><div><p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Reembolsável</p><div className="font-black text-3xl text-green-600">R$ {totalRef.toFixed(2)}</div></div><Wallet size={32} className="text-green-200"/></div>
            <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200 flex items-center justify-between"><div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Cartão Empresa</p><div className="font-black text-3xl text-slate-500">R$ {totalCorp.toFixed(2)}</div></div><CreditCard size={32} className="text-slate-300"/></div>
          </div>
          <ExpenseList data={sellerExpenses} isGestor={true} onViewAttachment={onViewAttachment} onEditExpense={onEditExpense} onDeleteExpense={onDeleteExpense} onUpdateStatus={onUpdateStatus} title="Histórico" />
        </>
      ) : (
        <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 uppercase font-black text-xs tracking-widest"><Search size={48} className="mb-4 opacity-20"/> Selecione um vendedor acima</div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin, isLoading }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={(e) => { e.preventDefault(); if(!onLogin(user, pass)) setErr('Dados de acesso inválidos'); }} className="bg-white p-8 sm:p-10 rounded-[32px] shadow-2xl w-full max-w-md text-center border border-slate-100">
        <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Receipt size={32} className="text-blue-600" /></div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight text-center">Kalenborn</h2>
        <p className="text-slate-400 text-xs sm:text-sm mb-8 text-center font-medium">Controlo de Despesas Corporativas</p>
        {err && <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs sm:text-sm rounded-2xl font-bold border border-red-100 animate-pulse text-center">{err}</div>}
        <div className="space-y-4 text-left">
          <input type="text" placeholder="Nome do utilizador" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={user} onChange={e => setUser(e.target.value)} required disabled={isLoading} />
          <input type="password" placeholder="Senha corporativa" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={pass} onChange={e => setPass(e.target.value)} required disabled={isLoading} />
          <button disabled={isLoading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest">ENTRAR</button>
        </div>
      </form>
    </div>
  );
}

function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ client: '', destination: '', startDate: '', endDate: '' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="border-b pb-4 flex items-center gap-3"><Briefcase className="text-blue-500" size={28}/><h2 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">Nova Viagem</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Cliente</label><input type="text" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.client} onChange={e => setForm({...form, client: e.target.value})} required /></div>
        <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Destino (Cidade)</label><input type="text" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required /></div>
        <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Início</label><input type="date" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required /></div>
        <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Fim Previsto</label><input type="date" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required /></div>
      </div>
      <button disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest">CRIAR VIAGEM</button>
    </form>
  );
}

function ExpenseForm({ onSubmit, trips, loading }) {
  const [form, setForm] = useState({ date: '', description: '', amount: '', category: 'Alimentação', location: '', tripId: '', isRefundable: true });
  const [file, setFile] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Anexe o comprovativo.");
    if (await onSubmit(form, file)) {
      setForm({ date: '', description: '', amount: '', category: 'Alimentação', location: '', tripId: '', isRefundable: true });
      setFile(null);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6 text-left">
      <h2 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">Registar Gasto</h2>
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-left">
        <label className="text-[10px] font-black text-blue-800 uppercase block mb-2 tracking-widest">Associar a Viagem Aberta</label>
        <select className="w-full p-4 border border-blue-200 rounded-2xl bg-white font-bold outline-none" value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})}>
          <option value="">-- Sem Viagem (Avulso) --</option>
          {trips.map(t => <option key={t.id} value={t.id}>{t.client} - {new Date(t.start_date).toLocaleDateString('pt-BR')}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Data</label><input type="date" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Valor (R$)</label><input type="number" step="0.01" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none font-bold text-xl" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Categoria</label><select className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Local</label><input type="text" list="cidades" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required /><datalist id="cidades">{BRAZILIAN_CITIES.map(c => <option key={c} value={c} />)}</datalist></div>
      </div>
      <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block ml-1">Descrição</label><input type="text" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer" onClick={() => setForm({...form, isRefundable: !form.isRefundable})}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${form.isRefundable ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-slate-300 text-slate-500'}`}>{form.isRefundable ? <CheckCircle size={24}/> : <CreditCard size={24}/>}</div>
        <div><div className="font-black text-sm text-slate-800">{form.isRefundable ? 'Despesa Reembolsável' : 'Despesa Cartão Corp'}</div><div className="text-[10px] text-slate-500 font-medium">{form.isRefundable ? 'Dinheiro do próprio bolso.' : 'Pago pela empresa.'}</div></div>
      </div>
      <div className="border-4 border-dashed p-10 rounded-3xl text-center bg-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer">
        <input type="file" onChange={e => setFile(e.target.files[0])} className="hidden" id="fileup" />
        <label htmlFor="fileup" className="cursor-pointer flex flex-col items-center"><Upload className="text-blue-500 mb-2" size={40} /><span className="text-slate-800 font-black tracking-tight">{file ? file.name : "Toque para anexar o comprovativo"}</span></label>
      </div>
      <button disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all uppercase tracking-widest shadow-xl">LANÇAR DESPESA</button>
    </form>
  );
}

function TripsList({ trips, expenses, getComputedTripStatus, onViewTrip }) {
  if (trips.length === 0) return <div className="bg-white p-10 rounded-3xl text-center text-slate-400 font-medium border border-slate-100 shadow-sm italic uppercase text-[10px] tracking-widest">Nenhuma viagem registada</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
      {trips.map(trip => {
        const tripExp = expenses.filter(e => e.tripId === trip.id);
        const total = tripExp.reduce((acc, e) => acc + parseFloat(e.amount), 0);
        const status = getComputedTripStatus(trip);
        return (
          <div key={trip.id} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all text-left">
            <div>
              <div className="flex justify-between items-start mb-4"><div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Plane size={24} /></div><div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${status === 'Aberta' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'} border`}>{status}</div></div>
              <h3 className="font-black text-xl text-slate-800 mb-1 leading-tight">{trip.client} - {new Date(trip.start_date).toLocaleDateString('pt-BR')}</h3>
              <p className="text-sm font-bold text-slate-500 mb-4">{trip.destination}</p>
            </div>
            <div className="border-t pt-5"><div className="flex justify-between items-end mb-5"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Acumulado</p><p className="font-black text-2xl tabular-nums">R$ {total.toFixed(2)}</p></div><button onClick={() => onViewTrip(trip)} className="bg-slate-50 px-4 py-2 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 border border-blue-50">Gerir</button></div></div>
          </div>
        );
      })}
    </div>
  );
}

function TripDetailsView({ trip, expenses, getComputedTripStatus, onBack, onCloseTrip, onDeleteTrip, onViewAttachment, onEditExpense, onDeleteExpense, loading }) {
  const status = getComputedTripStatus(trip);
  const isEditable = status === 'Aberta' || status === 'Em Revisão';
  const totalRef = expenses.filter(e => e.isRefundable).reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const totalCorp = expenses.filter(e => !e.isRefundable).reduce((acc, e) => acc + parseFloat(e.amount), 0);
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-xs font-black text-slate-500 uppercase bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm"><ArrowLeft size={16} /> Voltar</button>
      <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row justify-between gap-6">
        <div><h2 className="font-black text-2xl text-slate-800 leading-tight">{trip.client} - {new Date(trip.start_date).toLocaleDateString('pt-BR')}</h2><p className="text-slate-500 mb-4 mt-1 flex items-center gap-2 font-medium tracking-tight"><MapPin size={16}/> {trip.destination}</p><div className="flex gap-6"><div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">A Reembolsar</p><p className="font-black text-2xl text-green-600">R$ {totalRef.toFixed(2)}</p></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Cartão Empresa</p><p className="font-black text-2xl text-slate-400">R$ {totalCorp.toFixed(2)}</p></div></div></div>
        <div className="flex flex-col gap-3 min-w-[200px]">
          {status === 'Aberta' && <button onClick={() => onCloseTrip(trip.id, false)} disabled={loading || expenses.length === 0} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-xs shadow-xl uppercase tracking-widest">Concluir Viagem</button>}
          {status === 'Em Revisão' && <button onClick={() => onCloseTrip(trip.id, true)} disabled={loading} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-xl uppercase tracking-widest">Enviar Agora</button>}
          {status === 'Aberta' && expenses.length === 0 && <button onClick={onDeleteTrip} disabled={loading} className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-black text-xs uppercase flex justify-center items-center gap-2 border border-red-100 transition-colors"><Trash2 size={16}/> Excluir</button>}
        </div>
      </div>
      <ExpenseList data={expenses} isGestor={false} onViewAttachment={onViewAttachment} onEditExpense={isEditable ? onEditExpense : null} onDeleteExpense={isEditable ? onDeleteExpense : null} title="Despesas da Viagem" hideTripBadge />
    </div>
  );
}

function ExpenseList({ data, isGestor, onUpdateStatus, onViewAttachment, onEditExpense, onDeleteExpense, showAll, title, hideTripBadge }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden text-left shadow-sm">
      <div className="p-6 border-b flex justify-between items-center bg-white"><h2 className="font-black text-lg text-slate-800 tracking-tight">{title}</h2><span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{data.length}</span></div>
      <div className="divide-y divide-slate-100">
        {data.map(exp => (
          <div key={exp.id} className="p-5 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 hover:bg-slate-50 transition-all group">
            <div className="flex-1 text-left">
              {showAll && <div className="font-black text-blue-600 text-[10px] mb-1 uppercase tracking-widest">{exp.userName}</div>}
              <div className="flex items-center gap-2 text-slate-800 font-bold">{new Date(exp.date).toLocaleDateString('pt-BR')} <span className="text-[10px] text-slate-400 uppercase font-black px-2 border rounded-md border-slate-200">{exp.category}</span></div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-1 italic">{exp.description}</div>
              <div className="flex gap-2 items-center mt-1">
                {!hideTripBadge && exp.tripId && <div className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Viagem</div>}
                {!exp.isRefundable && <div className="inline-block bg-slate-100 text-slate-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Cartão Empresa</div>}
              </div>
            </div>
            <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-0 pt-3 lg:pt-0">
               <div className="text-right"><div className={`font-black text-xl tabular-nums ${exp.isRefundable ? 'text-slate-900' : 'text-slate-400 line-through decoration-slate-300'}`}>R$ {parseFloat(exp.amount).toFixed(2)}</div><div className={`text-[9px] font-black uppercase mt-1 ${exp.status === 'Enviado' ? 'text-blue-500' : 'text-green-600'}`}>{exp.status}</div></div>
               <div className="flex gap-2">
                 <button onClick={() => onViewAttachment({ name: exp.receiptName, userId: exp.userId })} className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Eye size={20}/></button>
                 {onEditExpense && <button onClick={() => onEditExpense(exp)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={20}/></button>}
                 {isGestor && exp.status === 'Enviado' && <button onClick={() => onUpdateStatus(exp.id, 'Aprovado')} className="p-3 bg-green-500 rounded-2xl text-white shadow-lg shadow-green-100 transition-all active:scale-95"><CheckCircle size={20}/></button>}
                 <button onClick={() => onDeleteExpense(exp.id)} className="p-3 bg-red-50 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyClosing({ expenses, onDownloadExcel, onDownloadZip, zippingState }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const months = [...new Set(expenses.map(e => e.month))].sort().reverse();
  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="bg-blue-100 p-3 rounded-2xl"><BarChart3 className="text-blue-600" size={28}/></div><h2 className="font-black text-xl text-slate-800 tracking-tight">Fechamento Mensal</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <div className="lg:col-span-1 space-y-3">{months.map(m => <button key={m} onClick={() => setSelectedMonth(m)} className={`w-full p-6 rounded-3xl border transition-all text-left flex justify-between items-center ${selectedMonth === m ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white border-slate-100 text-slate-800'}`}>{m}<Calendar size={20}/></button>)}</div>
        <div className="lg:col-span-2">{selectedMonth ? <ClosingDetails month={selectedMonth} expenses={expenses} onExcel={() => onDownloadExcel(selectedMonth)} onZip={(seller) => onDownloadZip(selectedMonth, seller)} zippingState={zippingState} /> : <div className="bg-white h-64 rounded-3xl border border-slate-100 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-xs italic">Selecione um mês à esquerda</div>}</div>
      </div>
    </div>
  );
}

function ClosingDetails({ month, expenses, onExcel, onZip, zippingState }) {
  const approved = expenses.filter(e => e.month === month && (e.status === 'Aprovado' || e.status === 'Fechado'));
  const byUser = approved.reduce((acc, exp) => {
    if(!acc[exp.userName]) acc[exp.userName] = { refund: 0, corp: 0, count: 0 };
    if(exp.isRefundable) acc[exp.userName].refund += parseFloat(exp.amount);
    else acc[exp.userName].corp += parseFloat(exp.amount);
    acc[exp.userName].count++;
    return acc;
  }, {});
  const totalGeral = Object.values(byUser).reduce((acc, u) => acc + u.refund, 0);
  return (
    <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-sm text-left animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 border-b pb-6 gap-4 text-left">
        <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Mês Referência</p><h3 className="font-black text-3xl text-slate-800">{month}</h3></div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={onExcel} className="flex-1 sm:flex-none bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg tracking-widest hover:bg-emerald-600 transition-all"><Download size={14}/> Excel GERAL</button>
          <button onClick={() => onZip(null)} disabled={zippingState.active && zippingState.label === 'GERAL'} className="flex-1 sm:flex-none bg-indigo-500 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg disabled:opacity-50 tracking-widest hover:bg-indigo-600 transition-all">
            {zippingState.active && zippingState.label === 'GERAL' ? <Clock size={14} className="animate-spin"/> : <Archive size={14}/>} ZIP GERAL
          </button>
        </div>
      </div>
      <div className="bg-green-50 rounded-3xl p-6 mb-8 border border-green-100 flex items-center justify-between"><div><p className="text-[10px] font-black text-green-600/70 uppercase tracking-widest mb-1">Total a Reembolsar Equipa</p><div className="font-black text-4xl text-green-600 tabular-nums">R$ {totalGeral.toFixed(2)}</div></div><Wallet size={48} className="text-green-200"/></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fecho Individual por Vendedor</p>
      <div className="space-y-4">
        {Object.entries(byUser).map(([name, data]) => (
          <div key={name} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-200 transition-colors">
            <div><div className="font-black text-lg text-slate-800">{name}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{data.count} Lançamentos Aprovados</div></div>
            <div className="flex gap-6 items-center text-right w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0">
              <div className="hidden xs:block"><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cartão Corp</p><p className="font-black text-sm text-slate-500">R$ {data.corp.toFixed(2)}</p></div>
              <div><p className="text-[9px] font-black text-green-600 uppercase">A Reembolsar</p><p className="font-black text-xl text-green-600">R$ {data.refund.toFixed(2)}</p></div>
              <button onClick={() => onZip(name)} disabled={zippingState.active && zippingState.label === name} className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 shadow-sm">{zippingState.active && zippingState.label === name ? <Clock size={20} className="animate-spin" /> : <Archive size={20}/>}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamManagement({ users, onAddUser, onDeleteUser, loading }) {
  const [form, setForm] = useState({ name: '', password: '', role: 'vendedor' });
  return (
    <div className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border border-slate-100 text-left animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8"><div className="bg-orange-100 p-3 rounded-2xl"><Users className="text-orange-600" size={28}/></div><h2 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight">Equipa</h2></div>
      <form onSubmit={(e)=>{e.preventDefault(); onAddUser(form); setForm({name:'', password:'', role:'vendedor'});}} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
        <div className="text-left"><label className="text-[9px] font-black uppercase text-slate-400 block ml-2 mb-1">Nome</label><input type="text" className="w-full p-4 rounded-2xl border border-slate-200 outline-none text-sm" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required /></div>
        <div className="text-left"><label className="text-[9px] font-black uppercase text-slate-400 block ml-2 mb-1">Senha</label><input type="text" className="w-full p-4 rounded-2xl border border-slate-200 outline-none text-sm" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required /></div>
        <div className="text-left"><label className="text-[9px] font-black uppercase text-slate-400 block ml-2 mb-1">Função</label><select className="w-full p-4 rounded-2xl border border-slate-200 outline-none text-sm" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}><option value="vendedor">Vendedor</option><option value="gestor">Gestor</option></select></div>
        <button disabled={loading} className="bg-orange-600 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest"><UserPlus size={18} className="inline mr-2"/> ADICIONAR</button>
      </form>
      <div className="divide-y divide-slate-100 text-left">{users.map(u => (<div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"><div><div className="font-black text-slate-800">{u.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</div></div><button onClick={()=>onDeleteUser(u.id)} disabled={u.role==='gestor'} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button></div>))}</div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-5 rounded-3xl font-black text-[11px] tracking-[0.2em] uppercase transition-all ${active ? 'bg-blue-600 text-white shadow-xl md:scale-[1.05]' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}>
      <div className="flex items-center gap-4">{icon} {label}</div>
      {badge > 0 && <span className="bg-red-500 text-white text-[9px] px-2 py-1 rounded-xl ring-4 ring-slate-50 animate-pulse">{badge}</span>}
    </button>
  );
}

function EditExpenseModal({ expense, trips, onSave, onClose, loading }) {
  const [form, setForm] = useState({ ...expense, tripId: expense.tripId || '' });
  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="bg-white rounded-[40px] max-w-2xl w-full p-6 sm:p-10 shadow-2xl text-left animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8 border-b pb-4"><h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Edit3 className="text-blue-500"/> Editar Despesa</h3><button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="sm:col-span-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Viagem</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" value={form.tripId} onChange={e=>setForm({...form, tripId: e.target.value})}><option value="">-- Sem Viagem --</option>{trips.map(t => <option key={t.id} value={t.id}>{t.client} - {new Date(t.start_date).toLocaleDateString('pt-BR')}</option>)}</select></div>
          <div className="text-left"><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Data</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} /></div>
          <div className="text-left"><label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Valor (R$)</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} /></div>
          <div className="sm:col-span-2 flex items-center gap-3 mt-4"><input type="checkbox" checked={form.isRefundable} onChange={e=>setForm({...form, isRefundable: e.target.checked})} className="w-6 h-6 rounded-lg accent-green-600 shadow-sm"/><label className="font-black text-sm text-slate-700">Gasto Reembolsável (Dinheiro Próprio)</label></div>
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t"><button onClick={onClose} className="px-8 py-4 rounded-2xl font-black uppercase text-xs text-slate-400 hover:bg-slate-100 transition-all">Cancelar</button><button onClick={() => onSave(expense.id, form)} disabled={loading} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-blue-700 transition-all">GUARDAR</button></div>
      </div>
    </div>
  );
}

function ConfirmModal({ item, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-50 backdrop-blur-md text-center">
      <div className="bg-white rounded-[40px] max-w-sm w-full p-10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} className="text-red-600" /></div>
        <h3 className="font-black text-2xl text-slate-800 mb-3 uppercase tracking-tighter text-center">Eliminar Registo?</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed italic text-center">Esta ação não pode ser revertida na base de dados.</p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} disabled={loading} className="w-full bg-red-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-xs hover:bg-red-700 shadow-xl tracking-widest transition-all">SIM, ELIMINAR</button>
          <button onClick={onClose} disabled={loading} className="w-full bg-slate-100 text-slate-600 px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">CANCELAR</button>
        </div>
      </div>
    </div>
  );
}

function AttachmentModal({ fileData, onClose }) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileData.userId}/${fileData.name}`;
  const isImage = publicUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|avif|gif)$/);
  return (
    <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-50 backdrop-blur-xl">
      <div className="bg-white rounded-[50px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b"><h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Eye size={24} className="text-blue-600"/> Comprovativo</h3><button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all"><X size={24} className="text-slate-500"/></button></div>
        <div className="flex-1 overflow-auto p-10 bg-slate-50 flex items-center justify-center text-center">
          {isImage ? <img src={publicUrl} alt="Recibo" className="max-w-full h-auto rounded-[32px] shadow-2xl border-4 border-white" /> : 
            <div className="text-center bg-white p-12 rounded-[40px] shadow-sm max-w-sm w-full flex flex-col items-center"><FileText size={60} className="text-blue-500 mx-auto mb-6" /><a href={publicUrl} target="_blank" rel="noreferrer" className="w-full flex justify-center items-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-blue-700 transition-all"><ExternalLink size={18}/> ABRIR DOCUMENTO</a></div>}
        </div>
      </div>
    </div>
  );
}

function MessageModal({ msg, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-50 backdrop-blur-2xl">
      <div className="bg-white rounded-[50px] max-w-sm w-full p-12 text-center shadow-2xl border border-white/10 animate-in zoom-in-75 duration-300">
        <div className="bg-green-100 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-inner"><CheckCircle size={48} className="text-green-600" /></div>
        <h3 className="font-black text-3xl text-slate-800 mb-4 tracking-tighter text-center">{msg.title}</h3>
        <p className="text-slate-400 text-sm mb-12 italic text-center leading-relaxed">"{msg.text}"</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white p-6 rounded-[32px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all text-sm shadow-xl">CONTINUAR</button>
      </div>
    </div>
  );
}
