import { ServiceCategory, ProfessionalProfile, ServiceRequest, ChatMessage, Review, User, WorkFeedPost } from './types';

export const CATEGORIES: ServiceCategory[] = [
  // --- Casa & Manutenção ---
  {
    id: 'eletricista',
    name: 'Electricista',
    iconName: 'Zap',
    description: 'Instalação elétrica, curto-circuitos, quadros e iluminação',
    popularCount: 1420,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Instalação de Quadros Elétricos',
      'Reparação de Curto-circuitos',
      'Montagem de Iluminação & Candeeiros',
      'Instalação de Tomadas e Interruptores',
      'Manutenção de Geradores & Inversores',
      'Vistoria & Certificação Elétrica'
    ]
  },
  {
    id: 'instalacao-residencial',
    name: 'Instalação Residencial',
    iconName: 'Zap',
    description: 'Instalação elétrica residencial, electrodomésticos, iluminação e utilidades',
    popularCount: 1280,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Instalação Elétrica Residencial Completa',
      'Instalação de Quadros Elétricos & Disjuntores',
      'Montagem de Lustres & Iluminação LED',
      'Instalação de Bombas de Água & Autoclaves',
      'Instalação de Intercomunicadores & Automatismos'
    ]
  },
  {
    id: 'antenas-parabolicas',
    name: 'Montagem de Antenas Parabólicas',
    iconName: 'Tv',
    description: 'Montagem e afinação de parabólicas Zap, DSTV, Starlink e sinal digital TV',
    popularCount: 1640,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Montagem & Afinação de Parabólica Zap/DSTV',
      'Instalação de Antena Starlink',
      'Reparação de Sinal & LNB',
      'Montagem de Suporte de TV na Parede',
      'Instalação de Cabos Coaxiais & Distribuição TV'
    ]
  },
  {
    id: 'reparacao-arca-frigorifico',
    name: 'Reparação de Arca & Frigorífico',
    iconName: 'Snowflake',
    description: 'Manutenção, carga de gás e reparação de arcas congeladoras e frigoríficos',
    popularCount: 1720,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Reparação de Arca Congeladora (Não gela)',
      'Reparação de Frigorífico Residencial',
      'Carga de Gás Refrigerante em Frigoríficos',
      'Substituição de Termostato e Compressor',
      'Manutenção de Arcas Industriais / Comerciais'
    ]
  },
  {
    id: 'reparacao-fogao',
    name: 'Reparação de Fogão',
    iconName: 'Flame',
    description: 'Conserto de fogões a gás, elétricos, fornos, limpeza de bicos e fugas de gás',
    popularCount: 1390,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Reparação de Fogão a Gás e Elétrico',
      'Desentupimento e Troca de Bicos de Fogão',
      'Reparação de Forno & Acendimento Elétrico',
      'Eliminação de Fugas de Gás de Cozinha',
      'Instalação de Tubagem & Regulador de Gás'
    ]
  },
  {
    id: 'reparacao-tv',
    name: 'Reparação de TV ao Domicílio',
    iconName: 'Tv',
    description: 'Conserto de Smart TV, LED, LCD, substituição de ecrã e placas ao domicílio',
    popularCount: 1580,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Reparação de Smart TV ao Domicílio (LED/LCD)',
      'Substituição de Barras de LED (TV sem imagem)',
      'Reparação de Placa Principal e Fonte de Alimentação',
      'Configuração de Canais & Sinal TV',
      'Fixação de TV na Parede com Suporte'
    ]
  },
  {
    id: 'estofador-sofas',
    name: 'Reparação de Sofás & Montagem',
    iconName: 'Sofa',
    description: 'Estofador profissional, reparação de sofás, mudança de tecido/napa e montagem',
    popularCount: 1450,
    color: 'green',
    group: 'Casa & Manutenção',
    items: [
      'Reparação & Estofamento de Sofás',
      'Troca de Tecido, Couro ou Napa de Sofá',
      'Substituição de Espuma & Molas Danificadas',
      'Montagem de Sofás e Móveis de Sala',
      'Restauro de Poltronas e Cadeiras Estofadas'
    ]
  },
  {
    id: 'canalizador',
    name: 'Canalizador',
    iconName: 'Droplet',
    description: 'Desentupimentos, reparação de fugas, eletrobombas e tubagens',
    popularCount: 1150,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Desentupimento de Esgoto e Piás',
      'Reparação de Fugas de Água',
      'Montagem de Eletrobombas & Autoclaves',
      'Instalação de Sanitários & Torneiras',
      'Redes de Água Quente/Fria',
      'Limpeza de Tanques de Água & Filtros'
    ]
  },
  {
    id: 'pintor',
    name: 'Pintura',
    iconName: 'Paintbrush',
    description: 'Pintura residencial, comercial, impermeabilização e acabamentos',
    popularCount: 980,
    color: 'green',
    group: 'Casa & Manutenção',
    items: [
      'Pintura Interior Residencial',
      'Pintura Exterior & Fachadas',
      'Impermeabilização de Paredes e Tetos',
      'Pintura Decorativa & Texturas',
      'Tratamento de Humidade & Salitre'
    ]
  },
  {
    id: 'estuque',
    name: 'Estuque & Pladur',
    iconName: 'Layers',
    description: 'Aplicação de estuque, teto falso em pladur e sancas decorativas',
    popularCount: 750,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Teto Falso em Pladur',
      'Sancas Decorativas com LED',
      'Divisórias em Pladur',
      'Estuque de Paredes',
      'Reparações em Gesso'
    ]
  },
  {
    id: 'mosaico',
    name: 'Mosaico & Azulejo',
    iconName: 'Sparkles',
    description: 'Assentamento de mosaicos, azulejos, porcelanato e cerâmica',
    popularCount: 820,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Assentamento de Mosaico no Chão',
      'Colocação de Azulejos de Cozinha/Banho',
      'Porcelanato de Grande Formato',
      'Revestimento Exterior',
      'Afagamento e Polimento de Mosaico'
    ]
  },
  {
    id: 'pedreiro',
    name: 'Pedreiro',
    iconName: 'HardHat',
    description: 'Construção, reboco, assentamento de blocos e pequenas obras',
    popularCount: 1040,
    color: 'green',
    group: 'Casa & Manutenção',
    items: [
      'Construção de Muros e Paredes',
      'Reboco e Emboço',
      'Assentamento de Blocos',
      'Fundações e Sapatas',
      'Pequenas Obras & Remodelações'
    ]
  },
  {
    id: 'carpinteiro',
    name: 'Carpinteiro',
    iconName: 'Hammer',
    description: 'Móveis por medida, reparação de portas, armários e decks',
    popularCount: 720,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Fabricação de Móveis por Medida',
      'Reparação de Portas e Janelas',
      'Colocação de Fechaduras',
      'Montagem de Armários e Roupeiros',
      'Construção de Decks em Madeira'
    ]
  },
  {
    id: 'serralheiro',
    name: 'Serralheiro',
    iconName: 'Wrench',
    description: 'Portões de ferro, grades de proteção, estruturas e caixilharia',
    popularCount: 680,
    color: 'emerald',
    group: 'Casa & Manutenção',
    items: [
      'Portões de Ferro Automatizados',
      'Grades de Proteção para Janelas',
      'Estruturas Metálicas e Coberturas',
      'Caixilharia de Alumínio',
      'Soldadura em Geral'
    ]
  },
  {
    id: 'ar-condicionado',
    name: 'Ar Condicionado',
    iconName: 'Wind',
    description: 'Montagem, carga de gás, manutenção preventiva e reparação de AC',
    popularCount: 1890,
    color: 'teal',
    group: 'Casa & Manutenção',
    items: [
      'Montagem & Instalação de AC',
      'Carga de Gás Refrigerante (R22/R410/R32)',
      'Manutenção Preventiva & Lavagem Profunda',
      'Reparação de Fugas e Compressores',
      'Desmontagem e Reinstalação de Unidades'
    ]
  },

  // --- Beleza ---
  {
    id: 'barbearia',
    name: 'Barbearia ao Domicílio',
    iconName: 'Scissors',
    description: 'Corte masculino, barba, pigmentação e estética facial em casa',
    popularCount: 1540,
    color: 'green',
    group: 'Beleza',
    items: [
      'Corte de Cabelo Masculino',
      'Barba & Design de Contorno',
      'Pigmentação & Tintura de Barba',
      'Limpeza Facial / Esfoliação',
      'Corte Infantil ao Domicílio'
    ]
  },
  {
    id: 'trancas-penteados',
    name: 'Tranças & Penteados',
    iconName: 'Crown',
    description: 'Tranças nagô, box braids, penteados de festa e colocação de extensões',
    popularCount: 1980,
    color: 'emerald',
    group: 'Beleza',
    items: [
      'Tranças Box Braids',
      'Tranças Nagô / Rasteiras',
      'Penteados para Noivas e Festas',
      'Colocação de Extensões & Perucas',
      'Tranças Infantis'
    ]
  },
  {
    id: 'manicure-pedicure',
    name: 'Manicure & Pedicure',
    iconName: 'Sparkle',
    description: 'Unhas de gel, gelinho, spa dos pés e manicure ao domicílio',
    popularCount: 1620,
    color: 'teal',
    group: 'Beleza',
    items: [
      'Unhas de Gel & Acrílico',
      'Verniz Gel / Gelinho',
      'Manicure Tradicional ao Domicílio',
      'Pedicure & Spa dos Pés',
      'Nail Art / Decoração de Unhas'
    ]
  },
  {
    id: 'maquilhagem',
    name: 'Make Up / Maquilhagem',
    iconName: 'Smile',
    description: 'Maquilhagem profissional para noivas, eventos, festas e sessões fotográficas',
    popularCount: 1250,
    color: 'green',
    group: 'Beleza',
    items: [
      'Make Up / Maquilhagem Profissional',
      'Maquilhagem para Noivas & Madrinhas',
      'Maquilhagem Social para Festas & Galas',
      'Maquilhagem para Fotografia & Vídeo',
      'Automaquilhagem (Aulas & Dicas)',
      'Design de Sobrancelhas & Extensionismo'
    ]
  },
  {
    id: 'perfumes-cosmeticos',
    name: 'Venda de Perfumes & Cosméticos',
    iconName: 'Gift',
    description: 'Venda de perfumes originais, cosméticos, cremes e tratamentos de beleza ao domicílio',
    popularCount: 1120,
    color: 'emerald',
    group: 'Beleza',
    items: [
      'Venda de Perfumes Originais ao Domicílio',
      'Kits de Cosméticos & Cuidados de Pele',
      'Produtos de Maquilhagem & Fragrâncias',
      'Presentes & Cabazes de Beleza',
      'Aconselhamento de Cosmética Personalizado'
    ]
  },
  {
    id: 'bijuterias-acessorios',
    name: 'Bijuterias & Acessórios',
    iconName: 'Gem',
    description: 'Bijuterias finas, relógios, brincos, pulseiras, colares e acessórios de moda',
    popularCount: 960,
    color: 'teal',
    group: 'Beleza',
    items: [
      'Bijuterias Finas & Conjuntos de Festa',
      'Relógios Masculinos & Femininos',
      'Brincos, Anéis e Colares Elegantes',
      'Acessórios para Cabelo e Noivas',
      'Entrega de Acessórios ao Domicílio'
    ]
  },
  {
    id: 'estetica-massagem',
    name: 'Estética & Massagem',
    iconName: 'Sparkle',
    description: 'Tratamentos faciais, depilação, massagem relaxante e limpeza de pele ao domicílio',
    popularCount: 1310,
    color: 'emerald',
    group: 'Beleza',
    items: [
      'Massagem Relaxante / Antiestresse',
      'Limpeza de Pele Profunda',
      'Massagem Modeladora / Drenagem',
      'Depilação a Cera',
      'Tratamentos Faciais'
    ]
  },

  // --- Eventos ---
  {
    id: 'decoracao-eventos',
    name: 'Decoração de Eventos',
    iconName: 'Sparkles',
    description: 'Decoração para casamentos, aniversários, batizados e eventos corporativos',
    popularCount: 1340,
    color: 'emerald',
    group: 'Eventos',
    items: [
      'Decoração de Casamentos',
      'Decoração de Aniversários & Festas Infantis',
      'Eventos Corporativos',
      'Painéis de Balões & Flores',
      'Iluminação Cênica'
    ]
  },
  {
    id: 'dj-som',
    name: 'DJ, Som & Iluminação',
    iconName: 'Music',
    description: 'Animação com DJ, aparelhagem de som, luzes e efeitos especiais',
    popularCount: 1110,
    color: 'teal',
    group: 'Eventos',
    items: [
      'Serviço de DJ para Festas',
      'Aluguer de Aparelhagem de Som',
      'Luzes de Pista & Efeitos de Fumo',
      'Microfones & Mesas de Mistura',
      'Karaoke'
    ]
  },
  {
    id: 'aluguer-bandas-musicais',
    name: 'Aluguer de Bandas Musicais',
    iconName: 'Mic',
    description: 'Contratação de bandas musicais ao vivo, grupos tradicionais e duetos para festas e eventos',
    popularCount: 1290,
    color: 'emerald',
    group: 'Eventos',
    items: [
      'Aluguer de Banda Musical ao Vivo para Casamentos',
      'Grupo Musical Tradicional / Semba / Kizomba',
      'Duo / Trio Acústico para Restaurantes & Eventos',
      'Vocalista / Cantores de Animação',
      'Instrumentistas (Saxofonista, Pianista, Guitarrista)'
    ]
  },
  {
    id: 'fotografia-filmagem',
    name: 'Fotografia & Filmagem',
    iconName: 'Camera',
    description: 'Sessões de fotos, cobertura de eventos, drones e edição de vídeo',
    popularCount: 1450,
    color: 'green',
    group: 'Eventos',
    items: [
      'Cobertura Fotográfica de Eventos',
      'Filmagem & Edição de Vídeo HD/4K',
      'Sessão Fotográfica Individual/Família',
      'Imagens com Drone',
      'Álbuns Digitais & Impressos'
    ]
  },
  {
    id: 'catering',
    name: 'Catering & Buffets',
    iconName: 'Utensils',
    description: 'Serviço de buffet, grelhados, churrasco, garçons e doçaria',
    popularCount: 1220,
    color: 'emerald',
    group: 'Eventos',
    items: [
      'Serviço de Buffet Completo',
      'Churrasco & Grelhados no Local',
      'Garçons e Barman',
      'Doçaria & Bolos de Aniversário',
      'Salgadinhos para Festas'
    ]
  },
  {
    id: 'tendas-mesas-cadeiras',
    name: 'Tendas, Mesas & Cadeiras',
    iconName: 'Home',
    description: 'Aluguer de tendas piramidais, mesas, cadeiras e toalhas para festas',
    popularCount: 980,
    color: 'teal',
    group: 'Eventos',
    items: [
      'Aluguer de Tendas Piramidais',
      'Aluguer de Mesas e Cadeiras',
      'Toalhas & Capas de Cadeiras',
      'Louça e Talheres para Eventos',
      'Estruturas de Palco'
    ]
  },
  {
    id: 'animacao-mestre-cerimonias',
    name: 'Animação & Protocolo',
    iconName: 'Users',
    description: 'Mestres de cerimónias, animação infantil, insufláveis e hospedeiras de protocolo',
    popularCount: 1180,
    color: 'emerald',
    group: 'Eventos',
    items: [
      'Mestre de Cerimónias (MC)',
      'Hospedeiras de Protocolo',
      'Animação Infantil & Palhaços',
      'Insufláveis & Pula-Pula',
      'Pinturas Faciais Infantis'
    ]
  },

  // --- Limpeza & Casa ---
  {
    id: 'empregada-domestica',
    name: 'Empregada Doméstica',
    iconName: 'Home',
    description: 'Serviço doméstico diário ou semanal, cozinhar e arrumar a casa',
    popularCount: 2100,
    color: 'green',
    group: 'Limpeza & Casa',
    items: [
      'Limpeza Diária / Semanal',
      'Cozinhar Refeições Tradicionais',
      'Lavar e Passar Ferro',
      'Arrumação Geral de Armários',
      'Serviço Interno ou Externo'
    ]
  },
  {
    id: 'limpeza-geral',
    name: 'Limpeza Geral & Pós-Obra',
    iconName: 'Sparkles',
    description: 'Higienização profunda residencial, escritórios e pós-construção',
    popularCount: 1650,
    color: 'emerald',
    group: 'Limpeza & Casa',
    items: [
      'Limpeza Pós-Construção / Pós-Obra',
      'Higienização Profunda de Escritórios',
      'Limpeza Geral Residencial',
      'Limpeza de Vidros e Janelas',
      'Desinfecção de Espaços'
    ]
  },
  {
    id: 'limpeza-sofas-colchoes',
    name: 'Limpeza de Sofás & Colchões',
    iconName: 'Sofa',
    description: 'Lavagem a seco e higienização profunda de sofás, colchões e tapetes',
    popularCount: 1780,
    color: 'teal',
    group: 'Limpeza & Casa',
    items: [
      'Lavagem a Seco de Sofás',
      'Higienização de Colchões',
      'Limpeza e Lavagem de Tapetes',
      'Higienização de Estofos de Automóveis',
      'Remoção de Manchas e Maus Odores'
    ]
  },
  {
    id: 'jardinagem',
    name: 'Jardinagem',
    iconName: 'Flower2',
    description: 'Manutenção de jardins, poda de árvores, relvados e irrigação',
    popularCount: 640,
    color: 'green',
    group: 'Limpeza & Casa',
    items: [
      'Corte e Manutenção de Relvados',
      'Poda de Árvores e Arbustos',
      'Plantação de Flores e Plantas',
      'Sistemas de Irrigação',
      'Tratamento Contra Pragas de Jardim'
    ]
  },

  // --- Cuidados ---
  {
    id: 'baba-crianças',
    name: 'Babá & Cuidadora de Crianças',
    iconName: 'Baby',
    description: 'Acompanhamento infantil, apoio escolar e cuidados diários com bebés',
    popularCount: 1850,
    color: 'emerald',
    group: 'Cuidados',
    items: [
      'Cuidadora de Bebés / Recém-Nascidos',
      'Acompanhamento Escolar & TPC',
      'Babá Noturna / Fins de Semana',
      'Cuidados de Alimentação e Higiene',
      'Atividades Recreativas Infantis'
    ]
  },
  {
    id: 'cuidador-idosos',
    name: 'Cuidador de Idosos & Acompanhamento',
    iconName: 'Heart',
    description: 'Apoio à terceira idade, medicação, companhia e auxílio de mobilidade (requisitos aplicáveis)',
    popularCount: 1290,
    color: 'teal',
    group: 'Cuidados',
    items: [
      'Apoio nas Atividades Diárias',
      'Acompanhamento a Consultas / Passeios',
      'Auxílio na Mobilidade e Higiene',
      'Companhia e Estímulo Cognitivo',
      'Supervisão de Medicação'
    ]
  },
  {
    id: 'enfermagem-domicilio',
    name: 'Enfermagem & Apoio Domiciliário',
    iconName: 'Heart',
    description: 'Pensos, injeções, medição de tensão, glicemia e cuidados de saúde ao domicílio',
    popularCount: 1470,
    color: 'green',
    group: 'Cuidados',
    items: [
      'Tratamento de Feridas e Pensos',
      'Aplicação de Injeções e Soros',
      'Medição de Tensão e Glicemia',
      'Cuidados Pós-Operatórios',
      'Cuidados de Acamados'
    ]
  },

  // --- Automóvel ---
  {
    id: 'lavagem-auto',
    name: 'Lavagem Auto ao Domicílio',
    iconName: 'Car',
    description: 'Lavagem ecológica, higienização de estofos e limpeza de viaturas no seu local',
    popularCount: 1420,
    color: 'green',
    group: 'Automóvel',
    items: [
      'Lavagem Ecológica Exterior',
      'Limpeza e Aspiração Interior',
      'Higienização de Ar Condicionado Auto',
      'Lavagem de Motor',
      'Aplicação de Cera Protetora'
    ]
  },
  {
    id: 'mecanica-auto',
    name: 'Mecânica Auto',
    iconName: 'Wrench',
    description: 'Manutenção preventiva, motor, travões, suspensão e diagnóstico computadorizado',
    popularCount: 1680,
    color: 'emerald',
    group: 'Automóvel',
    items: [
      'Mudança de Óleo e Filtros',
      'Revisão de Travões e Calços',
      'Diagnóstico Eletrónico Computadorizado',
      'Reparação de Motor e Caixa',
      'Suspensão e Direção'
    ]
  },
  {
    id: 'electricista-auto',
    name: 'Electricista Auto',
    iconName: 'Zap',
    description: 'Reparação do sistema elétrico, alternadores, motor de arranque, baterias e luzes',
    popularCount: 1190,
    color: 'teal',
    group: 'Automóvel',
    items: [
      'Reparação de Alternadores e Motores de Arranque',
      'Substituição e Teste de Baterias',
      'Reparação de Faróis e Luzes',
      'Instalação de Alarmes e Som Auto',
      'Diagnóstico Elétrico Auto'
    ]
  },
  {
    id: 'polimento-auto',
    name: 'Polimento & Detalhe',
    iconName: 'Sparkles',
    description: 'Polimento de pintura, restauração de faróis e proteção de pintura auto',
    popularCount: 940,
    color: 'green',
    group: 'Automóvel',
    items: [
      'Polimento de Pintura e Remoção de Riscos',
      'Restauração de Faróis Amarelados',
      'Vitrificação / Proteção Cerâmica',
      'Detalhamento Interior Completo',
      'Hidratação de Estofos em Couro'
    ]
  },
  {
    id: 'reboque-auto',
    name: 'Reboque & Assistência 24h',
    iconName: 'Truck',
    description: 'Serviço de reboque de viaturas e assistência de emergência na estrada',
    popularCount: 1050,
    color: 'emerald',
    group: 'Automóvel',
    items: [
      'Serviço de Reboque de Ligeiros',
      'Reboque de Viaturas Pesadas',
      'Carga de Bateria na Estrada (Encosto)',
      'Substituição de Pneu Furado',
      'Abertura de Portas Trancadas'
    ]
  },

  // --- Alimentação & Entregas ---
  {
    id: 'fastfood-hamburguer',
    name: 'Entrega de Fast Food & Petiscos',
    iconName: 'FastForward',
    description: 'Entrega rápida de hambúrgueres artesanais, cachorros quentes, pizas, petiscos e bebidas',
    popularCount: 2240,
    color: 'teal',
    group: 'Alimentação & Entregas',
    items: [
      'Entrega de Hambúrgueres Artesanais',
      'Entrega de Cachorros Quentes (Hot Dogs)',
      'Combos de Fast Food & Batatas Fritas',
      'Petiscos & Salgadinhos para Festas',
      'Bebidas Frescas & Sobremesas ao Domicílio'
    ]
  },

  // --- Pedido Personalizado / Outro Serviço ---
  {
    id: 'pedido-personalizado',
    name: 'Outro Serviço / Pedido Personalizado',
    iconName: 'Edit3',
    description: 'Não encontrou nas categorias? Escreva livremente o que precisa e receba orçamentos de profissionais qualificados!',
    popularCount: 2850,
    color: 'emerald',
    group: 'Pedido Personalizado',
    items: [
      'Descrever Pedido Personalizado',
      'Serviço Especializado Sob Consulta',
      'Outras Reparações ou Tarefas Específicas'
    ]
  }
];

export const DEFAULT_ADMIN_USER: User = {
  id: 'user-admin-1',
  name: 'António Abel Figueiredo Júlio',
  email: 'jfigueiredo790@gmail.com',
  phone: '+244 956 011 985',
  gender: 'masculino',
  role: 'admin',
  adminSubRole: 'super_admin',
  province: 'Icolo e Bengo',
  city: 'Icolo e Bengo',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  verified: true,
  ownerId: 'user-admin-1',
  createdAt: new Date().toISOString()
};

export const MOCK_USERS: User[] = [
  DEFAULT_ADMIN_USER,
  {
    id: 'user-duplo-lusevakueno',
    name: 'Lusevakueno Júlio',
    email: 'lusevakueno.julio@gmail.com',
    phone: '+244 923 456 789',
    gender: 'feminino',
    role: 'profissional',
    accountType: 'duplo',
    province: 'Luanda',
    city: 'Luanda',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    verified: true,
    ownerId: 'user-duplo-lusevakueno',
    createdAt: new Date().toISOString(),
    subscriptionPlan: 'plan_30d',
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'user-cli-makaya',
    name: 'Makaya',
    email: 'makaya@gmail.com',
    phone: '+244 945 112 233',
    gender: 'feminino',
    role: 'cliente',
    accountType: 'cliente',
    province: 'Luanda',
    city: 'Viana',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    verified: true,
    ownerId: 'user-cli-makaya',
    createdAt: new Date().toISOString()
  }
];

export const MOCK_PROFESSIONALS: ProfessionalProfile[] = [
  {
    id: 'pro-lusevakueno',
    name: 'Lusevakueno Júlio',
    email: 'lusevakueno.julio@gmail.com',
    phone: '+244 923 456 789',
    gender: 'feminino',
    role: 'profissional',
    accountType: 'duplo',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    categories: ['servicos-domesticos', 'consultoria'],
    province: 'Luanda',
    city: 'Luanda',
    address: 'Luanda, Angola',
    bio: 'Profissional qualificada com foco em excelência no atendimento e prestação de serviços na J Smart Services.',
    experienceYears: 3,
    hourlyRateKz: 5000,
    verified: true,
    rating: 5.0,
    reviewCount: 3,
    completedJobs: 8,
    documentsVerified: true,
    portfolioImages: [],
    status: 'disponivel',
    subscriptionPlan: 'plan_30d',
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  }
];

export const MOCK_REQUESTS: ServiceRequest[] = [];

export const MOCK_MESSAGES: ChatMessage[] = [];

export const MOCK_REVIEWS: Review[] = [];

export const MOCK_WORK_FEED_POSTS: WorkFeedPost[] = [];

