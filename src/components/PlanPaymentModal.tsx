import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  CheckCircle2, 
  Copy, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  Building2, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Send,
  Trash2,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface PlanPaymentModalProps {
  planKey: 'plan_7d' | 'plan_14d' | 'plan_30d';
  onClose: () => void;
  onSuccess: () => void;
}

export const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({ planKey, onClose, onSuccess }) => {
  const { currentUser, submitPaymentWithProof, platformSettings } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<'express' | 'iban'>('express');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // File proof upload state - strictly initialized to NULL (No dummy, sample or mock receipts)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofFileType, setProofFileType] = useState<'image' | 'pdf' | null>(null);
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofFileSizeStr, setProofFileSizeStr] = useState<string>('');
  const [proofNote, setProofNote] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const planDetails = {
    plan_7d: { name: 'Plano Semanal (7 Dias)', priceKz: 1500, priceStr: '1.500 Kz', period: '7 Dias' },
    plan_14d: { name: 'Plano Quinzenal (14 Dias)', priceKz: 3000, priceStr: '3.000 Kz', period: '14 Dias' },
    plan_30d: { name: 'Plano Mensal (30 Dias)', priceKz: 5000, priceStr: '5.000 Kz', period: '30 Dias' },
  }[planKey];

  const adminPhone = platformSettings?.adminPhoneExpress || '956011985';
  const formattedAdminPhone = '+244 956 011 985';
  const ibanNumber = platformSettings?.adminIban || 'AO06 0005 0000 6605 5740 1019 7';
  const ibanHolder = platformSettings?.adminHolderName || 'António Abel Figueiredo Júlio';
  const bankName = platformSettings?.adminBankName || 'Banco BCI (Banco de Comércio e Indústria)';

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous errors
    setUploadError(null);

    // Validate size (max 10MB)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError('O ficheiro selecionado ultrapassa o limite de 10MB. Por favor escolha um ficheiro menor.');
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const fileMime = file.type.toLowerCase();

    const isImage = fileMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);
    const isPdf = fileMime === 'application/pdf' || fileExt === 'pdf';

    if (!isImage && !isPdf) {
      setUploadError('Formato inválido. Por favor selecione uma imagem (JPG, JPEG, PNG, WEBP) ou um documento PDF.');
      return;
    }

    setSelectedFile(file);
    setProofFileName(file.name);
    setProofFileSizeStr(formatFileSize(file.size));
    setProofFileType(isPdf ? 'pdf' : 'image');

    // Read file as Data URL for local preview and transmission
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProofPreviewUrl(result);
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o ficheiro no seu dispositivo. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProofPreviewUrl(null);
    setProofFileType(null);
    setProofFileName('');
    setProofFileSizeStr('');
    setUploadError(null);
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
    `• Ficheiro Comprovativo: ${proofFileName || 'Anexado'}\n` +
    `• Referência/Nota: ${proofNote || 'Comprovativo oficial anexado'}\n\n` +
    `Solicito a verificação e ativação do meu pacote na plataforma.`
  );

  const whatsappUrl = `https://wa.me/244956011985?text=${whatsappMessage}`;

  const handleSubmit = () => {
    // Strict Validation: SEM FICHEIRO = SEM ENVIO
    if (!proofPreviewUrl || !selectedFile) {
      setUploadError('⚠️ É obrigatório selecionar um ficheiro real de comprovativo (imagem ou PDF) do seu dispositivo antes de submeter.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    setTimeout(() => {
      const res = submitPaymentWithProof({
        amountKz: planDetails.priceKz,
        type: 'payment',
        description: `Ativação de ${planDetails.name}`,
        paymentMethod: paymentMethod === 'express' ? 'Multicaixa Express (956011985)' : 'Transferência IBAN (Banco BCI)',
        proofUrl: proofPreviewUrl,
        proofFileName: proofFileName,
        proofFileType: proofFileType || 'image',
        proofFileSize: selectedFile.size,
        proofNote: proofNote || `Comprovativo (${proofFileName}) enviado para ${planDetails.name}`,
        planId: planKey
      });

      setIsSubmitting(false);

      if (res.success) {
        setSubmitted(true);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        setUploadError(res.message);
      }
    }, 800);
  };

  const handleCombinedSubmitAndWhatsApp = () => {
    // Strict Validation: SEM FICHEIRO = SEM ENVIO
    if (!proofPreviewUrl || !selectedFile) {
      setUploadError('⚠️ É obrigatório selecionar um ficheiro real de comprovativo (imagem ou PDF) do seu dispositivo antes de enviar.');
      return;
    }

    // Open WhatsApp with populated message
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
              Pagamento com Comprovativo Real
            </span>
            <h3 className="font-extrabold text-slate-900 text-lg mt-1">{planDetails.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">Comprovativo Enviado para Validação!</h4>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-left space-y-2">
              <p className="text-xs text-emerald-950 leading-relaxed font-bold">
                ✓ O seu comprovativo ({proofFileName}) foi submetido com sucesso à Área Administrativa.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                O estado do seu plano está como <strong>"Aguardando validação"</strong>. O administrador irá conferir o valor no extrato bancário e ativar o seu pacote em breve.
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

            {/* STEP 3: Anexar Comprovativo Real do Dispositivo */}
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                    2. Anexar Comprovativo Real do Pagamento *
                  </h4>
                  <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">
                    Selecione o ficheiro do comprovativo no seu dispositivo (<strong>Foto JPG, PNG, WEBP</strong> ou <strong>Documento PDF</strong>).
                  </p>
                </div>
              </div>

              {/* Upload & Preview Box */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-300 space-y-3">
                
                {/* File Picker Trigger */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Ficheiro do Comprovativo (Imagem ou PDF)
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Máx. 10MB</span>
                  </label>

                  {/* Empty State: Prompting User to Select Real File */}
                  {!selectedFile && (
                    <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center mb-2 transition-transform group-hover:scale-105">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        Clique para Selecionar o Comprovativo
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Suporta fotos (JPG, JPEG, PNG, WEBP) ou documentos (PDF)
                      </span>
                      <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}

                  {/* Preview State: Real Image Selected */}
                  {selectedFile && proofFileType === 'image' && proofPreviewUrl && (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center p-2">
                        <img 
                          src={proofPreviewUrl} 
                          alt="Comprovativo Selecionado" 
                          className="max-h-56 w-full object-contain rounded-xl" 
                        />
                        <span className="absolute bottom-3 right-3 bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black shadow flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Foto Pronta
                        </span>
                      </div>

                      {/* File Details Bar */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-extrabold text-slate-900 truncate">{proofFileName}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{proofFileSizeStr}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            <span>Trocar</span>
                            <input 
                              type="file" 
                              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                              onChange={handleFileUpload} 
                              className="hidden" 
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-1.5 rounded-lg transition-colors"
                            title="Remover ficheiro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview State: Real PDF Selected */}
                  {selectedFile && proofFileType === 'pdf' && (
                    <div className="space-y-2">
                      <div className="bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                            <FileText className="w-7 h-7" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              Documento PDF
                            </span>
                            <p className="font-extrabold text-slate-900 text-xs mt-1 truncate max-w-[220px]">
                              {proofFileName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold">{proofFileSizeStr}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            <span>Trocar</span>
                            <input 
                              type="file" 
                              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                              onChange={handleFileUpload} 
                              className="hidden" 
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-1.5 rounded-lg transition-colors"
                            title="Remover PDF"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        O documento PDF será enviado na íntegra para conferência do Administrador.
                      </p>
                    </div>
                  )}

                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Optional Note / Reference Input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Número de Transação / Observações (Opcional):
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Ex: N.º Operação BCI 789124, Express 956011985..."
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Send via WhatsApp AND Platform at once */}
                <button
                  type="button"
                  onClick={handleCombinedSubmitAndWhatsApp}
                  disabled={isSubmitting}
                  className={`w-full font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs ${
                    !selectedFile 
                      ? 'bg-slate-300 text-slate-600 hover:bg-slate-400 cursor-pointer' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar para WhatsApp (956011985) & Submeter na Plataforma</span>
                </button>

                {/* Standard Platform Only Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`w-full font-extrabold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs ${
                    !selectedFile 
                      ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <span>A submeter comprovativo ao administrador...</span>
                  ) : (
                    <>
                      <span>Submeter Apenas na Plataforma para Validação</span>
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
