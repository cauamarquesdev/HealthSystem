/**
 * Modelos iniciais criados automaticamente na primeira vez que a clínica abre "Modelos".
 *
 * ATENÇÃO: são textos de PARTIDA. A clínica deve revisá-los com a assessoria jurídica e o responsável técnico
 * antes de usar. Eles podem ser editados, duplicados ou excluídos na tela de Modelos.
 *
 * Sintaxe: "# Título" (centralizado), "## Subtítulo", "- item" (lista), **negrito**.
 * Variáveis automáticas: {{paciente.nome}} {{paciente.cpf}} {{paciente.nascimento}} {{paciente.telefone}}
 *   {{paciente.email}} {{clinica.nome}} {{profissional.nome}} {{data}} {{data.extenso}} {{hora}}
 * Qualquer outra {{variavel}} vira um campo para preencher ao gerar o documento.
 */

export type ModeloPadrao = {
  name: string;
  type: string;
  description: string;
  content: string;
  validityDays: number | null;
};

export const MODELOS_PADRAO: ModeloPadrao[] = [
  {
    name: 'Termo de Consentimento — Procedimentos Estéticos',
    type: 'TERMO_PROCEDIMENTO',
    description: 'Consentimento livre e esclarecido, genérico, para qualquer procedimento.',
    validityDays: null,
    content: `# TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, declaro que fui informado(a) de forma clara pelo(a) profissional **{{profissional.nome}}**, na **{{clinica.nome}}**, sobre o procedimento **{{procedimento}}**, incluindo sua finalidade, técnica, benefícios esperados, alternativas, riscos e possíveis efeitos adversos.

## Declarações
- Tive a oportunidade de esclarecer todas as minhas dúvidas antes de decidir realizar o procedimento.
- Compreendo que os resultados variam de pessoa para pessoa e que não há garantia de um resultado específico.
- Informei corretamente meu histórico de saúde, alergias, medicamentos em uso e condições como gestação ou lactação.
- Fui orientado(a) quanto aos cuidados antes e depois do procedimento e me comprometo a segui-los.
- Estou ciente de que podem ocorrer efeitos transitórios, como edema, vermelhidão, hematomas e desconforto, além de riscos menos frequentes explicados pelo(a) profissional.
- Autorizo a realização do procedimento e sei que posso retirar este consentimento antes de sua realização.

Data: {{data.extenso}}.`,
  },
  {
    name: 'Termo de Consentimento — Toxina Botulínica',
    type: 'TERMO_PROCEDIMENTO',
    description: 'Termo específico para aplicação de toxina botulínica.',
    validityDays: null,
    content: `# TERMO DE CONSENTIMENTO — TOXINA BOTULÍNICA

Eu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, autorizo a aplicação de toxina botulínica na região de **{{regiao}}**, a ser realizada por **{{profissional.nome}}** na **{{clinica.nome}}**.

## Fui informado(a) de que
- O efeito costuma surgir em alguns dias e pode durar alguns meses, variando entre as pessoas.
- Podem ocorrer dor local, vermelhidão, edema, hematomas, dor de cabeça e assimetrias transitórias.
- Em casos raros, pode ocorrer queda de pálpebra ou de sobrancelha, ou outras alterações temporárias da expressão facial.
- Pode ser necessário um retoque, avaliado após o período de ação do produto.
- O procedimento não é indicado na gestação, na lactação e em algumas doenças neuromusculares; informei toda a minha condição de saúde.

## Orientações
- Não deitar nas primeiras horas após a aplicação e evitar massagear a região.
- Evitar atividade física intensa e calor excessivo conforme orientação do(a) profissional.

Data: {{data.extenso}}.`,
  },
  {
    name: 'Termo de Consentimento — Preenchimento (Ácido Hialurônico)',
    type: 'TERMO_PROCEDIMENTO',
    description: 'Termo específico para preenchedores dérmicos.',
    validityDays: null,
    content: `# TERMO DE CONSENTIMENTO — PREENCHIMENTO

Eu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, autorizo o preenchimento com ácido hialurônico na região de **{{regiao}}**, realizado por **{{profissional.nome}}** na **{{clinica.nome}}**.

## Fui informado(a) de que
- O resultado depende de fatores individuais e pode exigir mais de uma sessão.
- Podem ocorrer dor, edema, hematomas, vermelhidão, nódulos palpáveis e assimetrias, geralmente transitórios.
- Complicações raras, porém graves, como alterações de circulação local, infecção ou reações alérgicas, foram explicadas e existem condutas para tratá-las.
- Devo procurar a clínica imediatamente diante de dor intensa, mudança de cor da pele ou alteração visual.

Data: {{data.extenso}}.`,
  },
  {
    name: 'Termo de Autorização de Uso de Imagem',
    type: 'TERMO_IMAGEM',
    description: 'Registro fotográfico para prontuário e acompanhamento (necessário para Fotos Clínicas).',
    validityDays: 365,
    content: `# TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM

Eu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, autorizo a **{{clinica.nome}}** a realizar registros fotográficos e audiovisuais do meu atendimento.

## Finalidade
- Compor meu prontuário e documentar a evolução do tratamento.
- Permitir a comparação de resultados (antes e depois) pela equipe de saúde responsável.

## Condições
- As imagens ficam armazenadas de forma segura, com acesso restrito aos profissionais autorizados.
- A utilização das imagens para divulgação em redes sociais, sites ou materiais publicitários **somente ocorrerá mediante autorização específica e adicional**.
- Posso revogar esta autorização a qualquer momento, mediante solicitação à clínica, sem prejuízo do meu atendimento.

Data: {{data.extenso}}.`,
  },
  {
    name: 'Termo de Consentimento para Tratamento de Dados (LGPD)',
    type: 'TERMO_LGPD',
    description: 'Consentimento e informações sobre o tratamento de dados pessoais e de saúde.',
    validityDays: null,
    content: `# TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS

Eu, **{{paciente.nome}}**, CPF {{paciente.cpf}}, declaro estar ciente de que a **{{clinica.nome}}**, na qualidade de controladora, tratará meus dados pessoais e dados pessoais sensíveis (dados de saúde), conforme a Lei nº 13.709/2018 (LGPD).

## Finalidades
- Prestação do atendimento e elaboração e guarda do meu prontuário.
- Agendamento, confirmação de consultas e comunicação sobre meu tratamento.
- Cumprimento de obrigações legais e regulatórias.
- Cobrança e gestão financeira dos serviços prestados.

## Compartilhamento
Meus dados poderão ser compartilhados apenas com profissionais envolvidos no meu atendimento, laboratórios, operadores de serviços necessários à clínica e autoridades, quando exigido por lei.

## Meus direitos
Posso solicitar, a qualquer momento, confirmação do tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamentos e a revogação deste consentimento, observados os prazos legais de guarda do prontuário.

Data: {{data.extenso}}.`,
  },
  {
    name: 'Orientações Pós-Procedimento',
    type: 'ORIENTACOES',
    description: 'Comprovante de entrega das orientações de cuidados após o procedimento.',
    validityDays: null,
    content: `# ORIENTAÇÕES PÓS-PROCEDIMENTO

Paciente: **{{paciente.nome}}**
Procedimento: **{{procedimento}}**
Data: {{data}}

## Cuidados gerais
- Seguir rigorosamente as orientações específicas passadas pelo(a) profissional **{{profissional.nome}}**.
- Evitar exposição solar direta e usar protetor solar conforme indicação.
- Não manipular ou coçar a área tratada.
- Em caso de dor intensa, febre, secreção, mudança de cor ou qualquer sintoma incomum, entrar em contato imediatamente com a **{{clinica.nome}}**.

Declaro que recebi e compreendi as orientações acima.`,
  },
  {
    name: 'Declaração de Comparecimento',
    type: 'DECLARACAO',
    description: 'Declara que o paciente esteve em atendimento na clínica.',
    validityDays: null,
    content: `# DECLARAÇÃO DE COMPARECIMENTO

Declaro, para os devidos fins, que **{{paciente.nome}}**, CPF {{paciente.cpf}}, esteve em atendimento na **{{clinica.nome}}** no dia {{data}}, no período das {{horario_inicio}} às {{horario_fim}}.

{{profissional.nome}}
{{data.extenso}}.`,
  },
  {
    name: 'Atestado',
    type: 'ATESTADO',
    description: 'Atestado de repouso. Informe o registro profissional ao gerar.',
    validityDays: null,
    content: `# ATESTADO

Atesto, para os devidos fins, que **{{paciente.nome}}**, CPF {{paciente.cpf}}, necessita de **{{dias}} dia(s)** de repouso, a partir de {{data}}.

{{profissional.nome}}
Registro profissional: {{registro_profissional}}
{{data.extenso}}.`,
  },
];