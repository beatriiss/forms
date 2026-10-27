export type QuestionType = "text" | "radio" | "checkbox";

export type Question = {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  allowOther?: boolean;
};

export type Section = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

export type Generation = "Z" | "Y";

export const GEN_OPTIONS: { value: Generation; label: string }[] = [
  { value: "Z", label: "1997 a 2010 - Geração Z" },
  { value: "Y", label: "1981 a 1996 - Geração Y (Millennials)" },
];

export const FORM_TITLE = "Qual o lifestyle da Geração Z?";

export const FORM_DESCRIPTION: string[] = [
  "Este formulário faz parte de uma pesquisa acadêmica que busca entender os hábitos, comportamentos e estilos de vida da Geração Z, incluindo temas como lazer, relacionamentos, consumo de álcool, uso de nicotina, atividade física, religião e influência das redes sociais.",
  "Sua participação é anônima e as respostas serão utilizadas exclusivamente para fins acadêmicos. Não serão divulgadas informações que permitam identificar você individualmente.",
];

export const MILLENNIAL_NOTICE = {
  title: "Atenção, Geração Millennials",
  text: "Responda às próximas perguntas de acordo com a sua vida quando você era jovem, entre os 18 e os 20 e poucos anos.",
};

export const OTHER_PREFIX = "Outro: ";

export const SECTIONS: Section[] = [
  {
    id: "perfil",
    title: "Perfil do participante",
    questions: [
      { id: "cidade", title: "Em qual cidade você mora?", type: "text", required: true },
      { id: "genero", title: "Qual é o seu gênero?", type: "radio", required: true, options: ["Feminino", "Masculino", "Não binário", "Prefiro não informar"], allowOther: true },
      { id: "orientacao", title: "Como você define sua orientação sexual?", type: "radio", required: false, options: ["Heterossexual", "Homossexual", "Bissexual", "Pansexual", "Assexual", "Prefiro não informar"], allowOther: true },
    ],
  },
  {
    id: "alcool",
    title: "Consumo de álcool",
    questions: [
      { id: "alcool_jovem", title: "Quando jovem, você consumia bebidas alcoólicas?", type: "radio", required: true, options: ["Sim", "Não", "Às vezes"] },
      { id: "alcool_frequencia", title: "Com que frequência você consome bebidas alcoólicas?", type: "radio", required: false, options: ["Nunca", "Raramente", "1 a 2 vezes por mês", "Toda semana", "Várias vezes por semana", "Todos os dias"] },
    ],
  },
  {
    id: "tabaco",
    title: "Tabaco e outras substâncias",
    questions: [
      { id: "fuma", title: "Você fuma?", type: "radio", required: true, options: ["Não", "Cigarro comum", "Vape", "Narguilé", "Mais de um tipo"] },
      { id: "percepcao_substancias", title: "Na sua percepção, o uso de álcool, cigarro/vape e outras drogas entre jovens da sua idade está:", type: "radio", required: true, options: ["Diminuindo", "Estável", "Aumentando um pouco", "Aumentando muito"] },
    ],
  },
  {
    id: "sexualidade",
    title: "Sexualidade e relacionamentos",
    questions: [
      { id: "relacoes_sexuais", title: "Você já teve relações sexuais?", type: "radio", required: true, options: ["Sim", "Não", "Prefiro não responder"] },
      { id: "frequencia_sexual", title: "Com que frequência você tem relações sexuais?", type: "radio", required: true, options: ["Nunca", "Raramente", "1 a 3 vezes por mês", "1 a 2 vezes por semana", "3 ou mais vezes por semana", "Prefiro não responder"] },
    ],
  },
  {
    id: "social",
    title: "Vida social",
    questions: [
      { id: "sai_noite", title: "Com que frequência você sai à noite?", type: "radio", required: true, options: ["Nunca", "Raramente", "1 vez por mês", "1 vez por semana", "2 ou mais vezes por semana"] },
      { id: "lugares", title: "Quais lugares você costuma frequentar?", type: "checkbox", required: true, options: ["Bares", "Baladas", "Casa de amigos", "Shopping", "Restaurantes", "Parques e praças", "Eventos e shows", "Praia"], allowOther: true },
      { id: "vontade_sair", title: "Você sente que sua vontade de sair diminuiu?", type: "radio", required: true, options: ["Sim, bastante", "Sim, um pouco", "Continua igual", "Aumentou"] },
    ],
  },
  {
    id: "hobbies",
    title: "Lifestyle / hobbies",
    questions: [
      { id: "atividades", title: "Quais atividades fazem parte da sua rotina?", type: "checkbox", required: true, options: ["Academia", "Esportes", "Jogos", "Séries e filmes", "Leitura", "Estudos", "Trabalho", "Música", "Redes sociais", "Passeios com amigos"], allowOther: true },
      { id: "atividade_fisica", title: "Quantos dias por semana você pratica atividade física?", type: "radio", required: true, options: ["Nenhum", "1 a 2 dias", "3 a 4 dias", "5 a 7 dias"] },
      { id: "religiao", title: "Você pratica alguma atividade religiosa ou espiritual?", type: "radio", required: true, options: ["Sim, com frequência", "Sim, ocasionalmente", "Sou espiritualizado(a), mas sem religião", "Não pratico"] },
    ],
  },
  {
    id: "redes",
    title: "Redes sociais e consumo",
    questions: [
      { id: "influencia_redes", title: "As redes sociais influenciam na maneira que você vive?", type: "radio", required: true, options: ["Muito", "Um pouco", "Pouco", "Nada"] },
      { id: "conteudos", title: "Quais conteúdos mais influenciam seus hábitos?", type: "checkbox", required: true, options: ["Fitness e saúde", "Alimentação", "Moda e beleza", "Humor e memes", "Influenciadores", "Notícias", "Games", "Nenhum"], allowOther: true },
      { id: "zero_acucar", title: "Com que frequência você costuma consumir alimentos/bebidas zero açúcar?", type: "radio", required: true, options: ["Nunca", "Raramente", "Algumas vezes por semana", "Todos os dias"] },
      { id: "motivo_zero", title: "Qual é o principal motivo para escolher esses produtos?", type: "radio", required: true, options: ["Saúde", "Emagrecimento", "Estética", "Diabetes ou restrição médica", "Gosto", "Influência das redes sociais", "Não consumo"], allowOther: true },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap((section) => section.questions);

export type Answers = Record<string, string | string[]>;
