import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, Copy, MessageSquare, ShieldCheck, AlertCircle, Phone, Building2, ExternalLink, ArrowRight, Upload, Image as ImageIcon, FileText, Send } from 'lucide-react';

interface PlanPaymentModalProps {
  planKey: 'plan_7d' | 'plan_14d' | 'plan_30d';
  onClose: () => void;
  onSuccess: () => void;
}

const generateBankReceiptSvg = (
  amountStr: string,
  methodName: string,
  userName: string,
  userPhone: string,
  holderName: string,
  bankName: string,
  ibanOrPhone: string
) => {
  const dateStr = new Date().toLocaleDateString('pt-AO');
  const timeStr = new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const docRef = `500295******${Math.floor(1000 + Math.random() * 9000)}`;

  const cleanIban = ibanOrPhone.replace(/\s+/g, '');
  const formattedIban = cleanIban.length > 15 
    ? `AO06.${cleanIban.slice(4, 8)}.${cleanIban.slice(8, 12)}.${cleanIban.slice(12, 16)}.${cleanIban.slice(16, 21)}`
    : cleanIban;

  const titleText = methodName.toLowerCase().includes('express')
    ? 'TRANSFERÊNCIA EXPRESS REALIZADA COM SUCESSO'
    : 'TRANSFERÊNCIA IBAN REALIZADA COM SUCESSO';

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="640" viewBox="0 0 540 640" fill="none">
  <!-- Card Canvas -->
  <rect width="540" height="640" rx="12" fill="#FFFFFF"/>
  <rect width="540" height="640" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  
  <!-- Top Orange Header Band -->
  <path d="M0 12C0 5.37258 5.37258 0 12 0H528C534.627 0 540 5.37258 540 12V60H0V12Z" fill="#FFFFFF"/>
  <path d="M0 0H310L270 50H0V0Z" fill="#F59E0B"/>

  <!-- Date / Ref top right -->
  <text x="510" y="28" fill="#1E293B" font-family="Arial, sans-serif" font-weight="700" font-size="13" text-anchor="end">${dateStr} ${timeStr}</text>
  <text x="510" y="46" fill="#64748B" font-family="Courier, monospace" font-weight="600" font-size="12" text-anchor="end">${docRef}</text>

  <!-- Status / Success Title -->
  <text x="270" y="115" fill="#D97706" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="0.5">${titleText}</text>

  <!-- Large Amount Section -->
  <text x="270" y="175" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="30" text-anchor="middle">${amountStr},00 Kz</text>
  <text x="270" y="196" fill="#D97706" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle" letter-spacing="1">MONTANTE</text>

  <!-- IBAN / Destination Number -->
  <text x="270" y="255" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="17" text-anchor="middle">${formattedIban}</text>
  <text x="270" y="275" fill="#D97706" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle" letter-spacing="1">${methodName.toLowerCase().includes('express') ? 'N.º EXPRESS (DESTINO)' : 'IBAN (DESTINO)'}</text>

  <!-- Beneficiary / Holder -->
  <text x="270" y="335" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="17" text-anchor="middle">${(holderName || 'ANTÓNIO ABEL FIGUEIREDO JÚLIO').toUpperCase()}</text>
  <text x="270" y="355" fill="#D97706" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle" letter-spacing="1">TITULAR / BENEFICIÁRIO (BANCO BCI)</text>

  <!-- Bank Name Tag -->
  <text x="270" y="388" fill="#475569" font-family="Arial, sans-serif" font-weight="700" font-size="12" text-anchor="middle">INSTITUIÇÃO: ${bankName.toUpperCase()}</text>

  <!-- Horizontal Divider Line -->
  <line x1="30" y1="415" x2="510" y2="415" stroke="#CBD5E1" stroke-width="1.5"/>

  <!-- Cost and Total Row -->
  <text x="60" y="445" fill="#64748B" font-family="Arial, sans-serif" font-weight="700" font-size="13">Custo</text>
  <text x="60" y="468" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="15">Isento</text>

  <text x="480" y="445" fill="#64748B" font-family="Arial, sans-serif" font-weight="700" font-size="13" text-anchor="end">Total</text>
  <text x="480" y="468" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="end">${amountStr},00 Kz</text>

  <!-- Horizontal Divider Line -->
  <line x1="30" y1="495" x2="510" y2="495" stroke="#F1F5F9" stroke-width="1.5"/>

  <!-- Current Balance Row -->
  <text x="270" y="530" fill="#0F172A" font-family="Arial, sans-serif" font-weight="900" font-size="14" text-anchor="middle">SALDO ACTUAL: ***** Kz 👁️</text>

  <!-- Bottom Badges / Notice -->
  <rect x="30" y="560" width="480" height="50" rx="10" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1"/>
  <text x="270" y="582" fill="#92400E" font-family="Arial, sans-serif" font-weight="800" font-size="11" text-anchor="middle">COMPROVATIVO EMITIDO PARA VALIDAÇÃO NA J SMART SERVICES</text>
  <text x="270" y="598" fill="#B45309" font-family="Arial, sans-serif" font-weight="700" font-size="10" text-anchor="middle">ORDENANTE: ${(userName || 'Profissional J Smart').toUpperCase()} (${userPhone || '956011985'})</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

export const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({ planKey, onClose, onSuccess }) => {
  const { currentUser, submitPaymentWithProof, platformSettings } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<'express' | 'iban'>('express');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const planDetails = {
    plan_7d: { name: 'Plano Semanal (7 Dias)', priceKz: 1500, priceStr: '1.500 Kz', period: '7 Dias' },
    plan_14d: { name: 'Plano Quinzenal (14 Dias)', priceKz: 2000, priceStr: '2.000 Kz', period: '14 Dias' },
    plan_30d: { name: 'Plano Mensal (30 Dias)', priceKz: 5000, priceStr: '5.000 Kz', period: '30 Dias' },
  }[planKey];

  const adminPhone = platformSettings?.adminPhoneExpress || '956011985';
  const formattedAdminPhone = '+244 956 011 985';
  const ibanNumber = platformSettings?.adminIban || 'AO06 0005 0000 6605 5740 1019 7';
  const ibanHolder = platformSettings?.adminHolderName || 'António Abel Figueiredo Júlio';
  const bankName = platformSettings?.adminBankName || 'Banco BCI (Banco de Comércio e Indústria)';

  // Initial Proof Receipt Image styled like an authentic bank transfer receipt
  const [proofImage, setProofImage] = useState<string>(() => 
    generateBankReceiptSvg(
      planDetails.priceStr,
      'Multicaixa Express',
      currentUser.name,
      currentUser.phone,
      ibanHolder,
      bankName,
      adminPhone
    )
  );

  useEffect(() => {
    // Regenerate receipt preview if payment method switches
    setProofImage(
      generateBankReceiptSvg(
        planDetails.priceStr,
        paymentMethod === 'express' ? 'Multicaixa Express' : 'Transferência IBAN (BCI)',
        currentUser.name,
        currentUser.phone,
        ibanHolder,
        bankName,
        paymentMethod === 'express' ? adminPhone : ibanNumber
      )
    );
  }, [paymentMethod, planDetails.priceStr, currentUser.name, currentUser.phone, ibanHolder, bankName, adminPhone, ibanNumber]);

  const [proofNote, setProofNote] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('O ficheiro é demasiado grande. Máximo 5MB.');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá Área Administrativa J Smart Services! 👋\n\n` +
    `Envio o comprovativo de pagamento do meu pacote:\n` +
    `• Pacote: ${planDetails.name} (${planDetails.priceStr})\n` +
    `• Método: ${paymentMethod === 'express' ? 'Multicaixa Express (956011985)' : 'Transferência IBAN (Banco BCI)'}\n` +
    `• Titular BCI: ${ibanHolder}\n` +
    `• IBAN / Nº: ${paymentMethod === 'express' ? adminPhone : ibanNumber}\n` +
    `• Profissional: ${currentUser.name}\n` +
    `• Telefone: ${currentUser.phone}\n` +
    `• E-mail: ${currentUser.email}\n` +
    `• Referência/Nota: ${proofNote || 'Comprovativo oficial anexado'}\n\n` +
    `Solicito a verificação e ativação do meu pacote na plataforma.`
  );

  const whatsappUrl = `https://wa.me/244956011985?text=${whatsappMessage}`;

  const handleSubmit = () => {
    if (!proofImage) {
      setUploadError('Por favor anexe a imagem/foto do comprovativo de pagamento.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    setTimeout(() => {
      submitPaymentWithProof({
        amountKz: planDetails.priceKz,
        type: 'payment',
        description: `Ativação de ${planDetails.name}`,
        paymentMethod: paymentMethod === 'express' ? 'Multicaixa Express (956011985)' : 'Transferência IBAN (Banco BCI)',
        proofUrl: proofImage,
        proofNote: proofNote || `Comprovativo enviado para ${planDetails.name} - Banco BCI / Express`,
        planId: planKey
      });

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    }, 1000);
  };

  const handleCombinedSubmitAndWhatsApp = () => {
    // Open WhatsApp in a new tab AND submit to admin on platform
    window.open(whatsappUrl, '_blank');
    handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Pagamento com Comprovativo Bancário
            </span>
            <h3 className="font-extrabold text-slate-900 text-lg mt-1">{planDetails.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">Comprovativo Submetido ao Administrador!</h4>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-left space-y-2">
              <p className="text-xs text-emerald-950 leading-relaxed font-bold">
                ✓ O seu comprovativo de pagamento foi enviado para a aprovação do Administrador na plataforma e para a área administrativa.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                O administrador irá conferir o valor no extrato do Banco BCI / Express e aprovar o seu pacote em breve.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Plan Price Summary Card */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-bold block">Valor a Pagar:</span>
                <span className="text-2xl font-black text-amber-400">{planDetails.priceStr}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">Validade do Pacote:</span>
                <span className="text-xs font-bold text-emerald-400">{planDetails.period}</span>
              </div>
            </div>

            {/* STEP 1: Escolha do Método de Pagamento */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                1. Escolha o Método de Pagamento *
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 1: Express */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('express')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'express'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-extrabold">Express</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Multicaixa Express por Número</p>
                </button>

                {/* Option 2: IBAN */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('iban')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'iban'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-extrabold">IBAN Bancário</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Transferência Bancária (BCI)</p>
                </button>
              </div>
            </div>

            {/* STEP 2: Detalhes do Pagamento Selecionado */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-extrabold text-slate-900">
                  {paymentMethod === 'express' ? '📱 Transferência Multicaixa Express' : '🏦 Transferência Bancária IBAN (Banco BCI)'}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  J Smart Services
                </span>
              </div>

              {paymentMethod === 'express' ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Número Express para Envio:</span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 mt-1 font-extrabold text-slate-900">
                      <span>{formattedAdminPhone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(adminPhone, 'phone')}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'phone' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Transfira o valor de <strong>{planDetails.priceStr}</strong> pelo seu aplicativo Multicaixa Express para o número <strong>956011985</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Banco & Titular da Conta:</span>
                    <p className="font-extrabold text-slate-900">{bankName}</p>
                    <p className="text-[11px] text-slate-800 font-bold mt-0.5">Titular: {ibanHolder}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mt-2">IBAN Angolano (Banco BCI):</span>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 mt-1 font-mono font-extrabold text-slate-900 text-xs">
                      <span className="truncate">{ibanNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(ibanNumber, 'iban')}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg shrink-0 ml-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === 'iban' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: Anexar e Enviar Comprovativo */}
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                    2. Comprovativo de Pagamento *
                  </h4>
                  <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">
                    Envie o comprovativo de uma só vez para o <strong>WhatsApp da Área Administrativa (956011985)</strong> e também para a <strong>Aprovação do Administrador na Plataforma</strong>.
                  </p>
                </div>
              </div>

              {/* Upload & Preview Box */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    Comprovativo Bancário (Foto/Ficheiro)
                  </span>
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {proofImage && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-sm flex items-center justify-center p-1">
                    <img src={proofImage} alt="Comprovativo Bancário" className="max-h-56 w-full object-contain rounded-lg" />
                    <span className="absolute bottom-2 right-2 bg-emerald-700 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow">
                      ✓ Comprovativo Pronto
                    </span>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {uploadError}
                  </p>
                )}

                {/* Optional Note / Reference Input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Número de Referência / Observações (Opcional):
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Ex: Ref BCI #889104, Express 956011985..."
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Dual Action as requested by user */}
              <div className="space-y-2 pt-1">
                {/* Send via WhatsApp AND Platform at once */}
                <button
                  type="button"
                  onClick={handleCombinedSubmitAndWhatsApp}
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar para WhatsApp (956011985) & Submeter na Plataforma</span>
                </button>

                {/* Standard Platform Only Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs"
                >
                  {isSubmitting ? (
                    <span>A submeter comprovativo ao administrador...</span>
                  ) : (
                    <>
                      <span>Submeter Apenas na Plataforma para Aprovação</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};
