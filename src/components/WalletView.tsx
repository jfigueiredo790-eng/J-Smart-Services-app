import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Banknote,
  Receipt,
  CreditCard,
  QrCode,
  Info,
  Upload,
  Image as ImageIcon,
  FileText,
  AlertCircle
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const { currentUser, userRole, walletTransactions, submitPaymentWithProof, requestWithdrawal, platformSettings, setActiveTab } = useApp();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('15000');
  const [paymentMethod, setPaymentMethod] = useState<'mc_express' | 'iban'>('mc_express');
  const [depositProofImage, setDepositProofImage] = useState<string | null>(null);
  const [depositProofFileName, setDepositProofFileName] = useState<string>('');
  const [depositProofFileType, setDepositProofFileType] = useState<'image' | 'pdf' | null>(null);
  const [depositProofNote, setDepositProofNote] = useState<string>('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositUploadError, setDepositUploadError] = useState<string | null>(null);

  // Modal Image Preview State
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState('10000');
  const [selectedBank, setSelectedBank] = useState('BCI');
  const [accountHolder, setAccountHolder] = useState(currentUser.name || '');
  const [iban, setIban] = useState('AO06 0040 0000 1234 5678 1015 4');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const angolaBanks = [
    { code: 'BAI', name: 'BAI (Banco Angolano de Investimentos)' },
    { code: 'BFA', name: 'BFA (Banco de Fomento Angola)' },
    { code: 'BIC', name: 'BIC (Banco BIC Angola)' },
    { code: 'ATL', name: 'Millennium Atlântico' },
    { code: 'BCI', name: 'BCI (Banco de Comércio e Indústria)' },
    { code: 'SOL', name: 'Banco Sol' },
    { code: 'SBA', name: 'Standard Bank Angola' },
    { code: 'KEVE', name: 'Banco Keve' }
  ];

  const balance = currentUser.walletBalanceKz || 0;

  // Strict User-Scoped Transaction History: Each user only views their own transactions
  const myTransactions = useMemo(() => {
    if (currentUser.role === 'admin' || userRole === 'admin') {
      return walletTransactions;
    }
    return walletTransactions.filter(tx => tx.userId === currentUser.id);
  }, [walletTransactions, currentUser.id, currentUser.role, userRole]);

  const handleDepositFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDepositUploadError(null);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const fileMime = file.type.toLowerCase();

    const isImage = fileMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);
    const isPdf = fileMime === 'application/pdf' || fileExt === 'pdf';

    if (!isImage && !isPdf) {
      setDepositUploadError('Por favor selecione uma imagem (JPG, PNG) ou documento PDF.');
      return;
    }

    setDepositProofFileName(file.name);
    setDepositProofFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      setDepositProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    
    if (!depositProofImage) {
      setDepositUploadError('⚠️ É obrigatório anexar o comprovativo real de pagamento do seu dispositivo.');
      return;
    }

    if (amount > 0) {
      submitPaymentWithProof({
        amountKz: amount,
        type: 'deposit',
        description: `Carregamento de Saldo na Carteira`,
        paymentMethod: paymentMethod === 'mc_express' ? 'Multicaixa Express' : 'Transferência IBAN',
        proofUrl: depositProofImage,
        proofFileName: depositProofFileName,
        proofFileType: depositProofFileType || 'image',
        proofNote: depositProofNote || `Carregamento de ${amount.toLocaleString('pt-AO')} Kz`
      });
      setDepositSuccess(true);
      setTimeout(() => {
        setDepositSuccess(false);
        setIsDepositOpen(false);
        setDepositProofImage(null);
        setDepositProofFileName('');
        setDepositProofFileType(null);
      }, 2000);
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (amount >= (platformSettings.minWithdrawalKz || 5000) && amount <= balance) {
      const bankDetails = `${selectedBank} • ${accountHolder} • ${iban}`;
      requestWithdrawal(amount, bankDetails);
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setIsWithdrawOpen(false);
      }, 1500);
    }
  };

  // CLIENT SPECIFIC VIEW (No wallet required)
  if (userRole === 'cliente') {
    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Banner Informativo de Pagamento Direto */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
                Pagamento Direto Sem Carteira
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Não precisa de saldo na aplicação
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Como cliente na <strong className="text-emerald-400 font-bold">J Smart Services</strong>, o pagamento dos serviços é efetuado <strong>diretamente ao profissional</strong> (em dinheiro físico, transferência bancária IBAN ou Multicaixa Express) após ou durante a realização do trabalho.
          </p>

          <div className="mt-6 p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Não precisa de recarregar nem manter dinheiro na app. Todo o processo é simples e transparente.
            </p>
          </div>
        </div>

        {/* O Fluxo do Cliente */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Como funciona a contratação para o Cliente:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div 
              onClick={() => setActiveTab('search')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                  1
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700">Procurar Profissionais</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Explore por categoria, cidade ou palavra-chave.</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('requests')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                  2
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700">Agendar Serviço</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Envie o pedido detalhado com data e local.</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('chat')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                  3
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700">Conversar no Chat</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Combine os detalhes e o meio de pagamento direto.</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('requests')}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                  4
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700">Avaliar o Trabalho</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Deixe uma avaliação com estrelas e comentário.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // PROFESSIONAL SPECIFIC VIEW
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      
      {/* Wallet Main Header Card for Professional */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Carteira do Profissional</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
              {balance.toLocaleString('pt-AO')} <span className="text-lg text-white font-bold">Kz</span>
            </p>
            <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Histórico de Subscrições e Pagamentos de Planos</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pro_dashboard')}
              className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ver / Escolher Planos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicador das Funcionalidades da Carteira do Profissional */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
        <div className="p-2 bg-emerald-600 text-white rounded-xl mt-0.5 shrink-0">
          <Banknote className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-900 text-xs">Para que serve a Carteira do Profissional?</h4>
          <ul className="text-xs text-slate-700 mt-1 space-y-1 list-disc list-inside">
            <li><strong>Ver os planos adquiridos:</strong> Plano Semanal (7 dias), Quinzenal (14 dias) e Mensal (30 dias).</li>
            <li><strong>Histórico de pagamentos:</strong> Consulte todos os recibos e comprovativos dos seus planos.</li>
            <li><strong>Aviso de Política:</strong> Os valores pagos para a ativação dos pacotes/planos não são sujeitos a devolução ou reembolso.</li>
          </ul>
        </div>
      </div>

      {/* Histórico de Transações de Planos */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Histórico de Pagamentos e Transações de Planos
          </span>
          <span className="text-xs font-bold text-slate-400">Total: {myTransactions.length}</span>
        </h3>

        {myTransactions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Ainda não existem pagamentos ou transações de planos para esta conta</p>
            <p className="text-[11px] text-slate-400 mt-1">Os seus pagamentos, comprovativos e ativações de pacotes ficarão listados aqui assim que efetuar uma subscrição.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTransactions.map((tx) => {
              const isPositive = tx.type === 'deposit' || tx.type === 'earning';
              const isPending = tx.status === 'pendente';
              const isRejected = tx.status === 'rejeitado';

              return (
                <div key={tx.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${isPending ? 'bg-amber-100 text-amber-700' : isRejected ? 'bg-rose-100 text-rose-700' : isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                      {tx.type === 'deposit' && <PlusCircle className="w-4 h-4" />}
                      {tx.type === 'earning' && <ArrowDownLeft className="w-4 h-4" />}
                      {tx.type === 'payment' && <ArrowUpRight className="w-4 h-4 text-slate-600" />}
                      {tx.type === 'commission' && <Banknote className="w-4 h-4 text-amber-600" />}
                      {tx.type === 'withdrawal' && <Building2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{tx.description}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('pt-AO')} • {tx.paymentMethod || 'Carteira'}
                      </p>
                      {tx.rejectionReason && (
                        <p className="text-[10px] text-rose-600 font-bold mt-0.5">
                          Motivo Rejeição: {tx.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {tx.proofUrl && (
                      <button
                        onClick={() => setViewProofUrl(tx.proofUrl || null)}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 shrink-0"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Ver Comprovativo</span>
                      </button>
                    )}

                    <div className="text-right">
                      <span className={`font-black text-sm block ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : '-'}{tx.amountKz.toLocaleString('pt-AO')} Kz
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        isPending 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : isRejected 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isPending ? '⏳ Pendente Admin' : isRejected ? '❌ Rejeitado' : '✓ Concluído'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Carregar Saldo na Carteira (Kz)
            </h3>

            {depositSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-xs font-bold space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p>Carregamento de {Number(depositAmount).toLocaleString('pt-AO')} Kz efetuado com sucesso!</p>
              </div>
            ) : (
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valor a Carregar (Kz)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Método de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mc_express')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 ${paymentMethod === 'mc_express' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-slate-200'}`}
                    >
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs">MC Express</p>
                        <p className="text-[10px] text-slate-500">Imediato</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('iban')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 ${paymentMethod === 'iban' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-slate-200'}`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs">Transferência IBAN</p>
                        <p className="text-[10px] text-slate-500">Bancos de Angola</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  {paymentMethod === 'mc_express' ? (
                    <p>💡 Envie via Express para <strong>{platformSettings.adminPhoneExpress || '956011985'}</strong> (WhatsApp da área administrativa: <strong>{platformSettings.adminPhoneWhatsapp || '956011985'}</strong>).</p>
                  ) : (
                    <div>
                      <p className="font-extrabold text-slate-900 mb-1">🏦 IBAN Oficial para Pagamentos:</p>
                      <p>• Banco: <strong>{platformSettings.adminBankName || 'BCI'}</strong></p>
                      <p>• Titular: <strong>{platformSettings.adminHolderName || 'António Abel Figueiredo Júlio'}</strong></p>
                      <p>• IBAN: <strong className="text-emerald-700 font-mono">{platformSettings.adminIban || 'AO06 0005 0000 6605 5740 1019 7'}</strong></p>
                    </div>
                  )}
                </div>

                {/* Comprovativo Upload */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Comprovativo de Pagamento (Foto ou PDF) *
                    </span>
                    <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>{depositProofImage ? 'Trocar Ficheiro' : 'Anexar Ficheiro'}</span>
                      <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" 
                        onChange={handleDepositFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {depositUploadError && (
                    <div className="p-2 bg-rose-100 text-rose-800 text-[11px] rounded-lg font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{depositUploadError}</span>
                    </div>
                  )}

                  {depositProofImage ? (
                    depositProofFileType === 'pdf' ? (
                      <div className="p-3 bg-white rounded-lg border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-6 h-6 text-rose-600" />
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs break-all leading-tight">{depositProofFileName || 'Documento.pdf'}</p>
                            <span className="text-[10px] text-rose-700 font-bold">Documento PDF Selecionado</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDepositProofImage(null);
                            setDepositProofFileName('');
                            setDepositProofFileType(null);
                          }}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-extrabold bg-rose-50 px-2 py-1 rounded"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-32 flex items-center justify-center bg-white">
                        <img src={depositProofImage} alt="Comprovativo Deposit" className="max-h-32 object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setDepositProofImage(null);
                            setDepositProofFileName('');
                            setDepositProofFileType(null);
                          }}
                          className="absolute top-1 right-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow"
                        >
                          ✕ Remover
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="p-3 border border-dashed border-slate-300 rounded-lg text-center bg-white text-[11px] text-slate-500">
                      Nenhum ficheiro selecionado. Selecione uma foto ou PDF do comprovativo.
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      value={depositProofNote}
                      onChange={(e) => setDepositProofNote(e.target.value)}
                      placeholder="Observações / Ref. do Comprovativo"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDepositOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs"
                  >
                    Submeter p/ Aprovação
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Viewer: Ver Comprovativo de Pagamento */}
      {viewProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Comprovativo de Pagamento
              </h3>
              <button onClick={() => setViewProofUrl(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-full">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 p-2 rounded-2xl border border-slate-200">
              {viewProofUrl.startsWith('data:application/pdf') || viewProofUrl.endsWith('.pdf') ? (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 text-rose-600 mx-auto" />
                  <p className="font-extrabold text-slate-900 text-sm">Documento PDF</p>
                  <a
                    href={viewProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl inline-block"
                  >
                    Abrir Documento PDF
                  </a>
                </div>
              ) : (
                <img src={viewProofUrl} alt="Comprovativo Completo" className="max-h-[60vh] object-contain rounded-lg shadow" />
              )}
            </div>
            <button
              onClick={() => setViewProofUrl(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* Modal: Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Pedir Reembolso / Transferência para IBAN
            </h3>

            {withdrawSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-xs font-bold space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p>Pedido de transferência enviado com sucesso!</p>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valor a Transferir (Kz)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={balance}
                    min={platformSettings.minWithdrawalKz || 5000}
                    className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Mínimo: {(platformSettings.minWithdrawalKz || 5000).toLocaleString('pt-AO')} Kz</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Banco em Angola</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {angolaBanks.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Titular da Conta</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Ex: João Manuel de Oliveira"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">IBAN Angolano (AO06)</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="AO06 0040 0000 1234 5678 1015 4"
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs"
                  >
                    Enviar Pedido
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
