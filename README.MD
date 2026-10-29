# HealthSystem 

**Sistema de gestão integrada para clínicas de estética e saúde.**

O HealthSystem é uma plataforma de gestão desenvolvida para centralizar e otimizar a operação de clínicas de estética, reunindo em um único ambiente o gerenciamento de pacientes, agendamentos, relacionamento com clientes, procedimentos, prontuários, avaliações estéticas, protocolos de tratamento, documentos e assinaturas, estoque de recursos e gestão financeira.

A proposta do sistema é oferecer uma experiência premium, com interface moderna, organização operacional, centralização de informações e ferramentas para auxiliar a equipe clínica e administrativa na tomada de decisões.

> **Status do projeto:** em desenvolvimento contínuo. A disponibilidade efetiva de cada funcionalidade depende da implementação e integração entre frontend, backend e banco de dados.

---

## 📋 Sumário

- [Visão geral](#-visão-geral)
- [Objetivos do projeto](#-objetivos-do-projeto)
- [Principais funcionalidades](#-principais-funcionalidades)
- [Descrição dos módulos](#-descrição-dos-módulos)
- [Arquitetura do sistema](#-arquitetura-do-sistema)
- [Tecnologias utilizadas](#-tecnologias-utilizadas)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Configuração do ambiente](#-configuração-do-ambiente)
- [Instalação e execução](#-instalação-e-execução)
- [API e integração](#-api-e-integração)
- [Banco de dados](#-banco-de-dados)
- [Autenticação e segurança](#-autenticação-e-segurança)
- [Fluxos de utilização](#-fluxos-de-utilização)
- [Diretrizes de desenvolvimento](#-diretrizes-de-desenvolvimento)
- [Próximas evoluções](#-próximas-evoluções)
- [Licença](#-licença)

---

## 🎯 Visão geral

O HealthSystem foi concebido como um sistema SaaS (*Software as a Service*) voltado para clínicas de estética que precisam organizar seus processos clínicos, comerciais e administrativos.

A plataforma busca substituir controles dispersos, planilhas e processos manuais por uma estrutura integrada, permitindo acompanhar desde o primeiro contato de um potencial cliente até o agendamento, a execução de procedimentos, o acompanhamento clínico, a cobrança e a manutenção do relacionamento.

O sistema contempla uma estrutura preparada para separar informações por clínica ou organização (*tenant*), permitindo a evolução para uma operação multiempresa.

### Principais diferenciais

- **Gestão centralizada:** informações operacionais, clínicas e financeiras em um único ambiente.
- **Experiência premium:** interface moderna, navegação consistente e componentes visuais padronizados.
- **Organização clínica:** prontuários, avaliações, procedimentos e protocolos de tratamento.
- **Gestão comercial:** CRM, acompanhamento de leads, orçamentos e oportunidades.
- **Controle operacional:** agenda, lista de espera, profissionais e recursos.
- **Gestão documental:** termos, documentos e fluxo público de assinatura eletrônica.
- **Estrutura SaaS:** organização de dados por clínica e possibilidade de expansão.
- **Arquitetura modular:** separação das responsabilidades entre frontend, backend e persistência de dados.

## 🚀 Objetivos do projeto

1. Centralizar a gestão diária de clínicas de estética.
2. Melhorar a organização dos agendamentos e o aproveitamento da agenda.
3. Manter o histórico de atendimento e a evolução dos pacientes.
4. Facilitar a conversão de leads em clientes.
5. Organizar procedimentos, pacotes e protocolos de tratamento.
6. Acompanhar receitas, despesas e indicadores financeiros.
7. Controlar materiais, insumos e recursos utilizados nas operações.
8. Padronizar documentos e facilitar a coleta de assinaturas.
9. Reduzir retrabalho e duplicidade de informações.
10. Criar uma base tecnológica escalável para novas funcionalidades.

---

## ✨ Principais funcionalidades

| Área | Funcionalidades |
|---|---|
| Dashboard | Indicadores, resumos operacionais e visão geral da clínica |
| Agenda | Visualização de horários, agendamentos e bloqueios |
| Pacientes | Cadastro, consulta e organização de clientes |
| CRM | Gestão de leads e oportunidades em Kanban |
| Procedimentos | Catálogo de serviços, preços, duração e custos |
| Prontuários | Anamnese, evolução clínica e histórico de atendimento |
| Avaliações estéticas | Registro e acompanhamento de avaliações |
| Protocolos | Composição de tratamentos e acompanhamento das etapas |
| Fotos clínicas | Organização de registros fotográficos clínicos |
| Documentos | Gestão de termos, documentos e assinaturas |
| Orçamentos | Organização de propostas e valores de tratamentos |
| Financeiro | Acompanhamento de vendas, receitas e movimentações |
| Lista de espera | Organização de clientes aguardando horários |
| Recursos | Gestão de materiais, insumos e recursos operacionais |
| Notificações | Centralização de avisos e eventos do sistema |
| Usuários | Autenticação, identificação e associação à clínica |

A relação acima descreve o escopo funcional do produto. Nem todos os módulos necessariamente possuem todos os fluxos concluídos ou integrados no ambiente atual.

---

## 🧩 Descrição dos módulos

### 1. Dashboard

Painel inicial destinado à visão geral da operação.

**Funcionalidades previstas:**
- Resumo dos principais indicadores da clínica.
- Visão dos agendamentos e compromissos.
- Indicadores de pacientes e atendimentos.
- Acompanhamento de informações comerciais e financeiras.
- Consulta rápida de dados relevantes para a rotina administrativa.

Os valores exibidos devem ser calculados a partir dos registros reais da aplicação, evitando indicadores inconsistentes entre módulos.

### 2. Notificações

Central de avisos para facilitar o acompanhamento dos acontecimentos da clínica.

**Objetivos:**
- Reunir alertas e notificações operacionais.
- Facilitar a identificação de eventos que exigem atenção.
- Oferecer um ponto central para futuras notificações de agendamentos, documentos e processos internos.

A entrega de notificações em tempo real ou por canais externos depende das integrações implementadas.

### 3. Agenda

Módulo responsável pela organização dos atendimentos e compromissos.

**Funcionalidades:**
- Visualização de horários em calendário.
- Criação de agendamentos.
- Associação do agendamento ao paciente e ao procedimento.
- Registro de data, horário e duração.
- Consulta aos detalhes do compromisso.
- Edição e exclusão de agendamentos, conforme as permissões e regras aplicáveis.
- Registro de bloqueios de agenda.
- Apoio à organização da disponibilidade dos profissionais.
- Integração com a lista de espera e os demais módulos operacionais.

**Objetivo:** reduzir conflitos de horário e facilitar o controle diário dos atendimentos.

### 4. Clientes e pacientes

Área dedicada ao cadastro e à consulta das informações dos clientes da clínica.

**Funcionalidades:**
- Cadastro de pacientes.
- Consulta dos dados cadastrados.
- Pesquisa e identificação de registros.
- Associação com agendamentos e procedimentos.
- Acesso ao histórico clínico e documental relacionado.
- Integração com CRM, prontuários, avaliações, protocolos e orçamentos.

O cadastro centralizado evita que cada módulo precise manter uma cópia independente das informações do paciente.

### 5. CRM Kanban

Módulo de relacionamento comercial para acompanhar leads e oportunidades.

**Funcionalidades previstas:**
- Visualização de oportunidades em formato Kanban.
- Organização por etapas do processo comercial.
- Acompanhamento da evolução de leads.
- Identificação de oportunidades pendentes.
- Integração com cadastro de contatos e pacientes.
- Apoio ao acompanhamento de orçamentos e conversões.

O fluxo comercial pode ser adaptado à realidade da clínica, desde o primeiro contato até o fechamento de um tratamento.

### 6. Procedimentos

Catálogo dos serviços oferecidos pela clínica.

**Informações associadas:**
- Nome do procedimento.
- Categoria.
- Duração estimada.
- Preço de venda.
- Custo associado.
- Situação do registro, quando aplicável.

**Utilizações:**
- Seleção de serviços durante o agendamento.
- Composição de protocolos.
- Apoio à elaboração de orçamentos.
- Referência para cálculos e indicadores financeiros.

A consistência dos preços é importante para evitar divergências entre agenda, vendas, orçamentos e dashboard.

### 7. Recursos

Módulo destinado à organização dos recursos necessários à operação da clínica.

O escopo pode incluir:
- Insumos e materiais.
- Cadastro e consulta de recursos.
- Organização de informações operacionais.
- Associação de recursos às rotinas e aos procedimentos, quando implementada.
- Controle de disponibilidade e utilização, conforme as regras do módulo.

O controle efetivo de estoque, movimentações, consumo e alertas de reposição depende da implementação específica dessas rotinas.

### 8. Lista de espera

Módulo para organizar pacientes que aguardam disponibilidade de horário.

**Objetivos:**
- Registrar pessoas interessadas em horários futuros.
- Organizar solicitações pendentes.
- Facilitar o acompanhamento das vagas disponíveis.
- Apoiar o preenchimento de horários cancelados.
- Integrar o fluxo de agendamento à rotina de atendimento.

Automações de aviso por WhatsApp, SMS ou e-mail dependem de integrações adicionais.

### 9. Prontuários

Área destinada à documentação clínica dos pacientes.

**Estrutura clínica contemplada:**
- Anamnese.
- Evolução clínica.
- Adendos.
- Associação das anotações aos pacientes.
- Associação de registros ao atendimento, quando aplicável.
- Histórico de informações clínicas.
- Registro de data e hora.
- Estrutura para assinatura e integridade de registros clínicos.

O modelo de dados contempla diferentes tipos de anotação clínica, como `ANAMNESE`, `EVOLUCAO` e `ADENDO`.

**Objetivo:** centralizar o histórico clínico e facilitar a continuidade do acompanhamento do paciente.

Os registros clínicos devem respeitar os requisitos de confidencialidade, rastreabilidade e integridade aplicáveis.

### 10. Avaliações estéticas

Módulo destinado à documentação e ao acompanhamento de avaliações estéticas.

**Objetivos funcionais:**
- Organizar as avaliações dos pacientes.
- Apoiar o registro das informações da avaliação.
- Facilitar o acompanhamento do tratamento.
- Integrar as avaliações com os dados clínicos do paciente.
- Permitir a consulta de indicadores e resumos da área.

A integração com prontuários deve evitar duplicidade de informações e preservar a distinção entre anamnese, avaliação estética e evolução clínica.

### 11. Protocolos de tratamento

Módulo para estruturar tratamentos compostos por múltiplas etapas ou procedimentos.

**Funcionalidades contempladas no desenho do módulo:**
- Criar e editar protocolos.
- Definir nome e categoria.
- Associar procedimentos às etapas.
- Calcular duração e prazo estimados.
- Calcular valores e descontos.
- Permitir preço manual, conforme as regras do protocolo.
- Ativar ou desativar protocolos.
- Duplicar protocolos.
- Aplicar protocolos a pacientes.
- Acompanhar aplicações em andamento.
- Avançar ou desfazer etapas.
- Cancelar ou retomar aplicações.
- Concluir o protocolo.
- Pesquisar pacientes e procedimentos disponíveis.

O fluxo de aplicação utiliza estados como `EM_ANDAMENTO`, `CONCLUIDO` e `CANCELADO`.

**Objetivo:** padronizar tratamentos, organizar sequências de procedimentos e facilitar o acompanhamento da execução.

### 12. Fotos clínicas

Módulo destinado à organização de imagens relacionadas ao acompanhamento clínico.

**Objetivos:**
- Organizar registros fotográficos por paciente.
- Apoiar a comparação da evolução estética.
- Relacionar imagens aos atendimentos ou tratamentos, quando aplicável.
- Facilitar a consulta do histórico visual.

O armazenamento, as permissões de acesso e a política de retenção das imagens devem ser definidos conforme a implementação e os requisitos de proteção de dados.

### 13. Termos e documentos

Módulo de gerenciamento de documentos utilizados pela clínica.

**Funcionalidades previstas:**
- Organização de documentos.
- Preparação de termos para apresentação ao paciente.
- Disponibilização de documentos para assinatura.
- Consulta ao estado do processo de assinatura.
- Integração com o cadastro do paciente.
- Acompanhamento dos registros documentais.

O projeto possui uma biblioteca compartilhada para a apresentação de documentos, a assinatura e o consumo da API pública.

### 14. Assinatura eletrônica de documentos

Fluxo público de assinatura acessado por um link específico, sem exigir que o paciente entre na área administrativa.

**Fluxo funcional:**
1. A clínica disponibiliza um documento para assinatura.
2. O paciente acessa o endereço público com seu token.
3. O sistema consulta a validade e a disponibilidade do documento.
4. O documento é apresentado para leitura.
5. O paciente informa os dados solicitados.
6. O paciente confirma a concordância e registra a assinatura manuscrita.
7. O frontend envia os dados à API.
8. O backend valida a solicitação e registra a assinatura.
9. O sistema apresenta a confirmação quando recebe uma resposta válida.

O fluxo contempla token de acesso, prazo de validade e regras para impedir a utilização indevida ou repetida do link, conforme a implementação do backend.

A validade jurídica do processo depende das evidências registradas, da identificação do signatário e dos requisitos legais aplicáveis. A existência de uma assinatura desenhada na tela, isoladamente, não garante conformidade jurídica.

### 15. Orçamentos

Módulo para organizar propostas comerciais de procedimentos e tratamentos.

**Objetivos:**
- Estruturar propostas para pacientes.
- Organizar procedimentos e respectivos valores.
- Apoiar a apresentação de tratamentos.
- Integrar o processo comercial ao CRM.
- Servir como etapa anterior à venda ou à contratação do tratamento.

Recursos como aprovação digital, geração de PDF e conversão automática em venda dependem das respectivas implementações.

### 16. Financeiro

Módulo para acompanhar a movimentação financeira da clínica.

**Escopo funcional:**
- Resumo financeiro.
- Consulta de vendas.
- Acompanhamento de valores relacionados aos atendimentos.
- Consulta de movimentações financeiras.
- Organização de informações de receitas e despesas, conforme os recursos implementados.
- Apoio à análise de resultados e indicadores.

O backend possui uma área financeira com rotas destinadas a resumos, itens faturáveis e vendas.

**Ponto importante:** faturamento previsto, vendas realizadas, recebimentos e despesas são conceitos diferentes. Os indicadores devem utilizar critérios consistentes e não somar valores previstos como se já fossem receitas recebidas.

### 17. Usuários e acesso

O sistema possui uma estrutura de autenticação e associação dos usuários à clínica.

**Responsabilidades:**
- Identificar o usuário autenticado.
- Fornecer o token de acesso.
- Proteger as rotas administrativas.
- Associar operações ao contexto da clínica.
- Apoiar a futura aplicação de perfis e permissões por função.

A autorização precisa ser aplicada também no backend. Esconder uma tela no frontend não substitui a validação de permissões na API.

---

## 🏗️ Arquitetura do sistema

O HealthSystem utiliza uma arquitetura separada em frontend, backend e banco de dados.

```text
HealthSystem/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── appointments/
│   │   ├── agenda/
│   │   ├── crm/
│   │   ├── dashboard/
│   │   ├── finance/
│   │   ├── medical-record/
│   │   ├── patients/
│   │   ├── procedures/
│   │   ├── prontuarios/
│   │   ├── protocolo/
│   │   ├── prisma/
│   │   ├── recurses/
│   │   ├── sales/
│   │   └── users/
│   └── ...
│
└── README.md
```

*Observação: a árvore é ilustrativa e reúne diretórios conhecidos do projeto. Os nomes e módulos podem variar conforme a versão atual do repositório.*

### Frontend

Responsável pela interface visual e pela interação com o usuário.

Principais responsabilidades:
- Renderização das páginas.
- Navegação entre módulos.
- Formulários e validações de entrada.
- Calendários e componentes interativos.
- Comunicação com a API.
- Apresentação de indicadores.
- Controle visual do acesso às áreas administrativas.
- Feedback de sucesso, erro e carregamento.

### Backend

Responsável pelas regras de negócio e pelo acesso aos dados.

Principais responsabilidades:
- Exposição dos endpoints REST.
- Autenticação e autorização.
- Validação dos dados recebidos.
- Regras de agendamento e atendimento.
- Gerenciamento de pacientes e procedimentos.
- Operações clínicas e documentais.
- Cálculos financeiros.
- Persistência por meio do Prisma.
- Aplicação das regras de isolamento entre clínicas.

### Banco de dados

Armazena os dados operacionais, clínicos, comerciais e financeiros da plataforma.

A estrutura utiliza PostgreSQL e Prisma ORM para modelar entidades, relacionamentos e operações de persistência.

---

## 🛠️ Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| Next.js | Aplicação web e roteamento do frontend |
| React | Construção das interfaces |
| TypeScript | Tipagem estática |
| Tailwind CSS | Estilização e layout responsivo |
| NestJS | Framework do backend |
| Node.js | Ambiente de execução do backend |
| Prisma ORM | Modelagem e acesso ao banco de dados |
| PostgreSQL | Banco de dados relacional |
| Neon | Serviço de PostgreSQL utilizado no ambiente do projeto |
| FullCalendar | Visualização e interação com calendários |
| Sonner | Notificações visuais na interface |
| Lucide React | Ícones da aplicação |

A disponibilidade e a versão exata de cada dependência devem ser confirmadas nos arquivos `package.json` do frontend e do backend.

---

## ⚙️ Configuração do ambiente

### Pré-requisitos

Instale ou configure:

- Node.js em versão compatível com as dependências.
- npm ou o gerenciador de pacotes definido pelo projeto.
- PostgreSQL ou uma instância compatível, como Neon.
- Git.
- Variáveis de ambiente do frontend e do backend.

### Variáveis de ambiente do frontend

Arquivo: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Essa variável define a URL base utilizada pelo frontend para se comunicar com o backend.

**Importante:** confira se cada módulo utiliza a URL base de forma consistente. Se a API estiver configurada com o prefixo global `/api`, as requisições devem incluir esse prefixo exatamente uma vez.

### Variáveis de ambiente do backend

Arquivo: `backend/.env`

```env
DATABASE_URL="SUA_URL_DE_CONEXAO_POSTGRESQL"
JWT_SECRET="DEFINA_UM_SEGREDO_FORTE"
```

Substitua os valores de exemplo pelos dados reais do ambiente.

- `DATABASE_URL`: URL de conexão com o banco de dados.
- `JWT_SECRET`: segredo utilizado na assinatura e validação dos tokens JWT, conforme a configuração de autenticação.

Nunca publique senhas, tokens, chaves privadas ou URLs de banco com credenciais em repositórios públicos.

---

## ▶️ Instalação e execução

### 1. Clonar o repositório

```bash
git clone URL_DO_REPOSITORIO
cd HealthSystem
```

Substitua `URL_DO_REPOSITORIO` pelo endereço real do repositório.

### 2. Instalar as dependências do backend

```bash
cd backend
npm install
```

Configure o arquivo `.env` antes de iniciar a aplicação.

### 3. Preparar o Prisma

Se o projeto já possuir as migrações necessárias, utilize o fluxo de migração definido pelo repositório:

```bash
npx prisma generate
npx prisma migrate deploy
```

Em ambiente local de desenvolvimento, a criação de novas migrações deve seguir o fluxo utilizado pela equipe. Não execute migrações de produção sem verificar o estado do banco e os scripts disponíveis.

### 4. Iniciar o backend

```bash
npm run start:dev
```

A API foi configurada para utilizar a porta `3001` no ambiente de desenvolvimento.

Prefixo global das rotas:

```text
/api
```

### 5. Instalar as dependências do frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o arquivo `.env.local` e configure `NEXT_PUBLIC_API_URL`.

### 6. Iniciar o frontend

```bash
npm run dev
```

O endereço padrão do Next.js em desenvolvimento é:

```text
http://localhost:3000
```

A porta efetiva pode variar se a porta padrão estiver ocupada.

> Os comandos acima pressupõem scripts convencionais de desenvolvimento. Confirme os scripts disponíveis nos arquivos `package.json` antes de executar, especialmente em versões com configurações personalizadas.

---

## 🔌 API e integração

O backend disponibiliza endpoints REST para comunicação com o frontend.

A URL base local é:

```text
http://localhost:3001/api
```

### Exemplos de áreas da API

| Área | Prefixo ilustrativo |
|---|---|
| Autenticação | `/api/auth` |
| Agenda e agendamentos | `/api/agenda` e `/api/appointments` |
| CRM | `/api/crm` |
| Dashboard | `/api/dashboard` |
| Financeiro | `/api/finance` |
| Pacientes | `/api/patients` |
| Procedimentos | `/api/procedures` |
| Prontuários | `/api/prontuarios` |
| Recursos | `/api/recursos` |
| Protocolos | `/api/protocolos` |
| Documentos | `/api/documentos` |

Os prefixos acima indicam as áreas conhecidas do projeto; os endpoints específicos devem ser consultados nos controllers e no código atual do backend.

### Integração pública de documentos

O fluxo de assinatura utiliza endpoints públicos com token:

```text
GET  /api/documentos/publico/:token
POST /api/documentos/publico/:token/assinar
```

Essas rotas permitem consultar um documento disponibilizado para assinatura e enviar os dados da assinatura, de acordo com as validações implementadas no servidor.

### Boas práticas de integração

- Centralizar o tratamento de erros HTTP.
- Validar os dados no backend, mesmo quando já existe validação no frontend.
- Padronizar os formatos de datas e valores monetários.
- Evitar duplicar o prefixo `/api`.
- Tratar respostas `400`, `401`, `403`, `404` e `500` de maneira adequada.
- Verificar o contexto da clínica em cada operação protegida.
- Evitar expor informações clínicas em logs ou mensagens de erro.
- Manter os contratos de dados entre frontend e backend sincronizados.

---

## 🗄️ Banco de dados

O projeto utiliza PostgreSQL com Prisma ORM.

Entre as entidades contempladas no modelo de dados estão:

- `Tenant`: organização ou clínica.
- `User`: usuários do sistema.
- `Contact`: contatos e registros relacionados.
- `Patient`: pacientes.
- `Appointment`: agendamentos.
- `Procedure`: procedimentos.
- `ClinicalNote`: registros clínicos.
- `Prescription`: prescrições.
- `Sale`: vendas.
- `FinancialTransaction`: movimentações financeiras.

A estrutura possui associações com `tenantId` em diversas entidades, permitindo vincular os registros à clínica correspondente.

### Diretrizes de modelagem

- Utilizar relacionamentos consistentes entre pacientes, atendimentos e procedimentos.
- Preservar o histórico clínico relevante.
- Evitar duplicidade de cadastros.
- Utilizar transações quando uma operação envolver alterações dependentes.
- Definir índices para consultas frequentes.
- Validar regras de exclusão e integridade referencial.
- Garantir que operações administrativas não acessem dados de outra clínica.

As entidades acima não representam necessariamente toda a estrutura do banco. O schema Prisma é a referência definitiva para os modelos existentes.

---

## 🔐 Autenticação e segurança

A aplicação possui um mecanismo de autenticação baseado em token e um componente de proteção de rotas no frontend.

O frontend utiliza o componente `AuthGuard` para controlar o acesso às áreas administrativas. O fluxo de autenticação utiliza a chave de armazenamento local `@ClinicOS:token` e o cookie `token`, conforme a implementação atual.

A rota pública de assinatura `/assinar/:token` possui tratamento específico para permitir que pacientes acessem documentos sem entrar na área administrativa.

### Requisitos de segurança

- Validar tokens no backend.
- Proteger endpoints privados com autenticação e autorização.
- Aplicar isolamento de dados por clínica.
- Validar entradas e limitar o tamanho de dados recebidos.
- Armazenar segredos somente em variáveis de ambiente.
- Não confiar exclusivamente no `tenantId` enviado pelo cliente.
- Aplicar permissões específicas para operações clínicas e financeiras.
- Restringir o acesso a prontuários e fotografias clínicas.
- Proteger links públicos de documentos com tokens imprevisíveis, validade e regras de utilização.
- Implementar registros de auditoria para operações sensíveis, conforme os requisitos do produto.

### Privacidade e conformidade

Como o sistema pode tratar dados pessoais e informações relacionadas à saúde, seu desenvolvimento deve considerar a Lei Geral de Proteção de Dados (LGPD), controles de acesso, minimização de dados, retenção adequada e medidas de segurança compatíveis com o risco.

A conformidade efetiva depende da implementação técnica, dos procedimentos operacionais e das políticas adotadas pela clínica.

---

## 🔄 Fluxos de utilização

### Fluxo de atendimento

1. Cadastrar ou localizar o paciente.
2. Selecionar um procedimento.
3. Agendar o atendimento.
4. Consultar as informações clínicas pertinentes.
5. Realizar o atendimento.
6. Registrar a avaliação ou evolução clínica aplicável.
7. Atualizar o acompanhamento do paciente.

### Fluxo comercial

1. Registrar um lead no CRM.
2. Acompanhar a oportunidade.
3. Converter o contato em paciente, quando apropriado.
4. Elaborar um orçamento.
5. Organizar os procedimentos ou o protocolo proposto.
6. Registrar a venda quando houver contratação.
7. Acompanhar os resultados financeiros.

### Fluxo de protocolo

1. Criar um protocolo.
2. Selecionar os procedimentos e as etapas.
3. Definir os valores e as condições.
4. Aplicar o protocolo a um paciente.
5. Acompanhar a execução das etapas.
6. Registrar o avanço ou realizar os ajustes permitidos.
7. Concluir ou cancelar a aplicação, conforme as regras do sistema.

### Fluxo de assinatura documental

1. Preparar o documento.
2. Disponibilizar o link para o paciente.
3. Validar o token e a validade do documento.
4. Apresentar o conteúdo para leitura.
5. Coletar os dados e a assinatura.
6. Registrar a solicitação no backend.
7. Confirmar o resultado somente após a resposta do servidor.

---

## 🧭 Diretrizes de desenvolvimento

Para manter a qualidade e a consistência do sistema:

- Preservar a arquitetura modular do NestJS.
- Separar controllers, services e regras de negócio.
- Manter os componentes reutilizáveis do frontend.
- Centralizar a comunicação com a API sempre que possível.
- Evitar duplicação de lógica entre módulos.
- Manter os tipos TypeScript sincronizados com os contratos da API.
- Padronizar mensagens de erro, carregamento e sucesso.
- Criar testes para regras financeiras e fluxos clínicos sensíveis.
- Verificar os relacionamentos do Prisma antes de alterar o schema.
- Testar os fluxos com diferentes usuários e clínicas.
- Validar os cálculos de duração, preço, desconto e faturamento.
- Manter a interface responsiva e acessível.
- Documentar mudanças relevantes de endpoints e modelos de dados.

### Tratamento de erros

As operações devem considerar:
- Dados inválidos.
- Usuário não autenticado.
- Permissão insuficiente.
- Clínica não identificada.
- Registro inexistente.
- Conflitos de agendamento.
- Documento expirado ou já assinado.
- Falhas de conexão com a API.
- Erros de persistência no banco de dados.

---

## 📈 Próximas evoluções

A evolução do HealthSystem pode contemplar:

- Relatórios gerenciais e financeiros avançados.
- Controle de estoque com entradas, saídas e consumo por procedimento.
- Notificações automáticas de agendamentos e confirmações.
- Integração com WhatsApp e e-mail.
- Gestão detalhada de profissionais, salas e disponibilidade.
- Indicadores de conversão do CRM.
- Emissão de relatórios e documentos em PDF.
- Controle de permissões por perfil.
- Auditoria detalhada de operações.
- Melhorias no fluxo de assinatura e nas evidências documentais.
- Testes automatizados de integração e de regras de negócio.
- Monitoramento, logs estruturados e estratégias de backup.
- Aprimoramentos de desempenho e escalabilidade multiempresa.

Esses itens representam possibilidades de evolução e não devem ser interpretados como funcionalidades já entregues.

---

## 📄 Licença

A licença do HealthSystem deve ser definida pelos responsáveis pelo projeto.

Enquanto não houver uma licença explícita no repositório, não presuma que o código está disponível para redistribuição ou uso comercial irrestrito.

---

## 💎 HealthSystem — Gestão Premium

Uma plataforma modular para conectar a operação clínica, o relacionamento com pacientes, os tratamentos, os documentos e a gestão financeira em um único sistema.

**Objetivo do produto:** proporcionar mais organização, controle operacional e visibilidade para a gestão de clínicas de estética.
