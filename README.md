# AlagaMap 🌧️🗺️

> Rotas seguras em dias de chuva: um mapa colaborativo de alagamentos que sugere caminhos que desviam das vias afetadas.

**Status:** MVP (1ª entrega — 08/10/2026) · Projeto de Aplicação Prática / Fábrica de Software

---

## 1. Nome do projeto e integrantes

**Projeto:** AlagaMap
**Turma:** 4º período A
**Repositório:** https://github.com/Marcaogabriel/AlagaMap

| # | Integrante |
|---|------------|
| 1 | José Edson |
| 2 | João Gabriel |
| 3 | Marcos Gabriel |
| 4 | Matheus Pacífico |
| 5 | Enzo Gripe |
| 6 | Rodrigo Ávila |
| 7 | Pedro Henrique |
| 8 | Wiliam Casado |

---

## 2. Problema e público-alvo

**Problema.** Em dias de chuva, o Recife sofre com alagamentos que interditam vias e surpreendem quem precisa se deslocar. Falta informação atualizada e confiável sobre quais trechos estão transitáveis.

**Quem enfrenta.** Moradores, motoristas, motoboys, entregadores, usuários de transporte e estudantes que se deslocam pela cidade.

**Por que resolver.** Reduzir atrasos, riscos de acidente e prejuízos, aproveitando relatos colaborativos da própria população para apoiar a decisão de rota.

---

## 3. Solução e funcionalidades

O AlagaMap é um aplicativo web colaborativo: os usuários **reportam pontos alagados** no mapa e o sistema **recalcula as rotas** entre bairros, penalizando ou bloqueando as vias afetadas.

Funcionalidades essenciais:

- Cadastro e login de usuários
- Mapa interativo com alertas ativos
- Relato de alagamento com nível de gravidade
- Confirmação dos relatos pela comunidade
- Sugestão de rota recomendada, com alternativas

---

## 4. Escopo do MVP

### ✅ Entregue nesta versão

- **Cadastro e login** com validação (e-mail único, senha com no mínimo 6 caracteres e confirmação de senha); sessão mantida no navegador.
- **Mapa interativo** (Leaflet + OpenStreetMap) centrado no Recife, com os 10 bairros do grafo marcados.
- **Cálculo de rotas seguras:** até 3 rotas entre origem e destino, ordenadas por tempo estimado, com destaque para a recomendada e tags de situação (*Livre*, *Atenção*, *Risco*, *Bloqueada*).
- **Relato de alagamento** em 3 níveis: *Água baixa*, *Transitável c/ risco* e *Intransitável*, com texto de referência e marcação do ponto no mapa.
- **Votos da comunidade:** "Ainda alagado" e "Já normalizou".
- **Expiração automática** dos alertas após 90 minutos (e botão para limpar os expirados).
- **Filtro por bairro**, **geolocalização** do usuário e **histórico** dos últimos relatos.
- **Interface responsiva** em tema escuro, com avisos (toasts) de feedback.

**Funcionalidade principal demonstrável:** reportar um alagamento e ver a rota recomendada ser recalculada para desviar dele.

**Relação com o problema:** o usuário enxerga onde há alagamento e recebe a rota mais segura, não apenas a mais curta.

### 🔜 Fica para o produto final

- Migração do front-end para **React**
- **Back-end com banco de dados** e autenticação segura (hoje os dados ficam no `localStorage` e as senhas não são criptografadas)
- Uso da **malha viária real** no lugar dos 10 bairros fixos
- Integração com **dados meteorológicos**
- Notificações de alerta e moderação de relatos
- Testes automatizados e publicação (deploy)

---

## 5. Tecnologias utilizadas

| Tecnologia | Uso no projeto | Situação no MVP |
|------------|----------------|-----------------|
| HTML5 e CSS3 | Telas de login/cadastro e do mapa; layout responsivo em tema escuro | Implementado |
| JavaScript (ES6) | Autenticação local, relatos, votos, expiração, filtro e cálculo de rotas | Implementado |
| Leaflet + OpenStreetMap | Mapa interativo e camadas de alertas | Implementado |
| OSRM (serviço público) | Traçado das rotas pelas ruas | Implementado, com fallback em linha reta |
| `localStorage` | Persistência local de usuários e relatos | Implementado (temporário) |
| React + back-end/banco de dados | Versão final: front-end em React, API e persistência real | Previsto |

> O MVP foi desenvolvido **apenas com HTML, CSS e JavaScript**. O front-end da versão final será migrado para **React** na próxima etapa.

### Como as rotas são calculadas

1. As vias formam um grafo com 10 bairros do Recife e 15 ligações (distância e tempo base).
2. Cada relato ativo afeta as vias em um raio de 450 m. A gravidade vira penalidade de tempo: **+6 min** (água baixa), **+20 min** (transitável com risco) ou **via bloqueada** (intransitável).
3. O **algoritmo de Dijkstra** encontra o melhor caminho; para gerar alternativas, as ligações da rota já escolhida recebem custo extra e o cálculo é repetido (até 3 rotas).
4. A geometria exibida no mapa vem do OSRM; se o serviço estiver indisponível, o app desenha linhas retas entre os bairros.

---

## 6. Análise de viabilidade

A solução **continua viável**: o MVP, feito só com HTML, CSS e JavaScript, já demonstra o fluxo completo (login → relato de alagamento → rota segura) dentro do prazo.

Ajustes previstos:

- As vias são simuladas (10 bairros do Recife); a versão final usará dados reais.
- O `localStorage` será substituído por back-end e banco de dados.
- O front-end será migrado para React para facilitar a manutenção e a evolução.

---

## 7. Cronograma e riscos

### Cronograma

| Etapa | Situação |
|-------|----------|
| Definição do problema, público e escopo | ✅ Concluída |
| MVP — 1ª entrega (08/10/2026) | ✅ Concluída |
| Produto final com React, back-end e banco de dados | 🔜 A planejar |

### Riscos

| Risco / dificuldade | Impacto | Resposta da equipe |
|---------------------|---------|--------------------|
| Dados de vias simulados (grafo de 10 bairros) | Rotas limitadas a pontos pré-definidos | Validar a lógica no MVP; malha viária real na versão final |
| Autenticação e dados só no navegador | Senhas sem criptografia; dados não compartilhados entre dispositivos | Aceito no MVP; back-end com login seguro na versão final |
| Dependência de serviços externos (OSRM e mapa OSM) | Sem o serviço, o traçado vira linha reta | Fallback implementado no código |
| Relatos falsos ou desatualizados | Alertas incorretos distorcem as rotas | Votos da comunidade e expiração em 90 min |

---

## 8. Como executar o projeto

**Pré-requisitos:** navegador moderno e conexão com a internet (o mapa, o Leaflet e o OSRM são carregados online).

1. Clone o repositório: `git clone https://github.com/Marcaogabriel/AlagaMap.git` (ou baixe o ZIP).
2. Abra a pasta do projeto e rode **uma** das opções:
   - **Direto no navegador:** abra o arquivo `index.html`.
   - **Servidor local (recomendado, para a geolocalização funcionar):**
     ```bash
     # na pasta do projeto
     python -m http.server 5500
     ```
     Depois acesse `http://localhost:5500`.
     (Alternativa: extensão *Live Server* do VS Code.)
3. Na tela inicial, crie uma conta em **Cadastro** ou entre com uma conta de demonstração:

   | Nome | E-mail | Senha |
   |------|--------|-------|
   | Ana Silva | `ana@alagamap.com` | `123456` |
   | Bruno Costa | `bruno@alagamap.com` | `123456` |

4. No mapa: escolha origem e destino e clique em **Calcular rotas seguras**; para reportar, escolha a gravidade, clique em **Marcar no mapa e reportar** e toque no ponto alagado.

### Estrutura de pastas

```
AlagaMap/
├── index.html        # Login e cadastro
├── map.html          # Mapa, rotas, relatos e histórico
├── css/
│   └── style.css     # Estilos (tema escuro e responsivo)
└── js/
    └── app.js        # Autenticação, relatos, rotas (Dijkstra) e mapa
```

---

## Equipe

Projeto desenvolvido pela turma do **4º período A**: José Edson, João Gabriel, Marcos Gabriel, Matheus Pacífico, Enzo Gripe, Rodrigo Ávila, Pedro Henrique e Wiliam Casado.