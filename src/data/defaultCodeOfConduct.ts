import { CodeOfConductSection } from '../types';

export const DEFAULT_CODE_OF_CONDUCT_RULES: CodeOfConductSection[] = [
  {
    id: 'regras_gerais',
    title: 'A. Regras Gerais da J Smart Services',
    targetRoleScope: 'todos',
    iconName: 'ShieldCheck',
    summary: 'Princípios fundamentais de utilização, convivência, segurança e privacidade na plataforma.',
    items: [
      'A plataforma J Smart Services tem como objetivo conectar clientes e profissionais de serviços em Angola com transparência, segurança e respeito mútuo.',
      'Respeito entre utilizadores: Todos os utilizadores (clientes e profissionais) devem comunicar-se com cortesia, urbanidade e profissionalismo em qualquer interação.',
      'Segurança física e patrimonial: É obrigatório zelar pela segurança interpessoal e do local durante todos os agendamentos e prestação de serviços.',
      'Proteção de dados e privacidade: Os dados de contacto (telefone, morada, e-mail) devem ser utilizados exclusivamente para a prestação do serviço e nunca partilhados com terceiros sem consentimento.',
      'Utilização correta da plataforma: É expressamente proibido simular pagamentos, forjar avaliações ou fraudar o sistema de orçamentos e agendamentos.'
    ]
  },
  {
    id: 'conduta_cliente',
    title: 'B. Código de Conduta do Cliente',
    targetRoleScope: 'cliente',
    iconName: 'UserCheck',
    summary: 'Deveres, obrigações e boas práticas de conduta para os clientes solicitantes.',
    items: [
      'Respeitar os profissionais: Tratar o profissional prestador com urbanidade, cortesia e providenciar um ambiente adequado e seguro para a realização do trabalho.',
      'Fornecer informações verdadeiras sobre o serviço solicitado: Descrever detalhadamente a avaria, fotos do problema e o endereço exato em Angola.',
      'Não assediar, ameaçar ou ofender profissionais: É expressamente proibido qualquer tipo de ofensa verbal, assédio moral, discriminação ou intimidação.',
      'Não utilizar a plataforma para atividades ilegais: É vedado solicitar trabalhos que violem as leis em vigor na República de Angola.',
      'Cumprir os pagamentos acordados: Efetuar o pagamento do valor acordado no orçamento aprovado após a conclusão e validação do serviço.',
      'Não criar falsas reclamações: Relatar unicamente situações verídicas à administração e não submeter queixas infundadas para obter descontos indevidos.',
      'Cumprir as regras de cancelamento: Comunicar o cancelamento com antecedência razoável e respeitar a compensação de deslocação caso o profissional já se encontre a caminho.'
    ]
  },
  {
    id: 'conduta_profissional',
    title: 'C. Código de Conduta do Profissional',
    targetRoleScope: 'profissional',
    iconName: 'Briefcase',
    summary: 'Padrões éticos, pontualidade, transparência e qualidade exigidos aos profissionais prestadores.',
    items: [
      'Tratar o cliente com respeito e profissionalismo: Manter uma atitude pontual, ética, educada e focada na excelência do serviço prestado.',
      'Cumprir o serviço acordado: Executar rigorosamente o escopo técnico definido e aprovado no orçamento sem alterações não autorizadas.',
      'Apresentar informações verdadeiras sobre experiência, preço e serviços: Manter qualificações reais, preços transparentes e documentos oficiais verificados (BI / NIF em Angola).',
      'Não cobrar valores diferentes dos acordados sem justificativa: Qualquer alteração orçamental deve ser explicada e previamente aprovada pelo cliente antes da execução.',
      'Não assediar, ameaçar ou ofender clientes: Conduta imprópria, linguagem abusiva ou intimidação causam o bloqueio definitivo e imediato da conta.',
      'Não utilizar os dados dos clientes para fins indevidos: É estritamente proibido utilizar contactos de clientes para fins pessoais, spam ou fora da prestação do serviço.',
      'Cumprir os horários e compromissos assumidos: Ser pontual nos agendamentos e notificar o cliente imediatamente em caso de força maior ou imprevisto de transporte.',
      'Manter comportamento profissional durante a prestação do serviço: Respeitar o espaço do cliente, manter a organização e deixar o local limpo após os trabalhos.'
    ]
  },
  {
    id: 'condutas_proibidas',
    title: 'D. Condutas Proibidas',
    targetRoleScope: 'todos',
    iconName: 'AlertTriangle',
    summary: 'Lista clara de comportamentos proibidos que causam suspensão ou banimento imediato.',
    items: [
      'Fraudes, tentativas de golpe financeiro ou falsificação de comprovativos de pagamento.',
      'Falsificação de informações pessoais, documentos de identidade ou qualificações técnicas.',
      'Ameaças, chantagem, extorsão ou agressões físicas e verbais.',
      'Assédio moral, sexual, racial ou qualquer tipo de discriminação na República de Angola.',
      'Ofensas, linguagem obscena, difamação ou agressão psicológica.',
      'Utilização da plataforma para quaisquer atividades ilícitas ou proibidas por lei.',
      'Criação de contas falsas, perfis duplicados ou falsas identidades.',
      'Manipulação de avaliações, combinação de notas fictícias ou suborno por comentários positivos.',
      'Qualquer comportamento que coloque em risco a integridade física, emocional ou patrimonial de outro utilizador.'
    ]
  },
  {
    id: 'denuncias',
    title: 'E. Denúncias e Reclamações',
    targetRoleScope: 'todos',
    iconName: 'Flag',
    summary: 'Canais formais para denunciar infrações e procedimentos de análise pela J Smart Services.',
    items: [
      'Como denunciar: Tanto clientes como profissionais podem reportar violações através do botão "Denunciar / Apoio" disponível nos pedidos, no chat ou na Central de Suporte.',
      'Evidências: Ao submeter uma denúncia, inclua capturas de ecrã, histórico de mensagens do chat ou registos fotografados do serviço.',
      'Análise imparcial: A equipa de auditoria e mediação da J Smart Services analisa todas as denúncias num prazo máximo de 24 horas úteis.',
      'Garantia de confidencialidade: A identidade do denunciante é mantida em absoluto sigilo administrativo.',
      'Ações preventivas: Durante a investigação, a plataforma poderá suspender preventivamente as contas envolvidas até o apuramento dos factos.'
    ]
  },
  {
    id: 'medidas_disciplinares',
    title: 'F. Medidas Disciplinares',
    targetRoleScope: 'todos',
    iconName: 'Gavel',
    summary: 'Graduação de sanções e penalizações aplicáveis em caso de violação do código de conduta.',
    items: [
      '⚠️ Emitir advertência formal: Notificação por escrito no sistema e registo na ficha de conduta do utilizador.',
      '⏳ Suspender temporariamente a conta: Impedimento temporário de criar novos pedidos, responder a orçamentos ou aceitar serviços.',
      '🔒 Bloquear determinadas funcionalidades: Restrição de acesso ao chat de mensagens, submissão de propostas ou carregamentos da carteira.',
      '🛑 Cancelar a conta: Desativação definitiva e permanente da conta na plataforma J Smart Services.',
      '🚫 Impedir novo acesso à plataforma: Bloqueio do número de telefone, NIF e e-mail para impedir reabertura de conta.',
      '⚖️ Encaminhar situações graves às autoridades competentes: Casos de fraude, roubo, agressão ou atividades ilícitas serão formalmente participados às forças policiais e judiciais na República de Angola.'
    ]
  }
];
