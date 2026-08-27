# DESIGN_SPEC.md — ModelField UI/Motion Spec

Spec de design/implementação para agentes de código. Complementa `AGENTS.md`.
Quando esta spec conflitar com regras arquiteturais do AGENTS.md, o AGENTS.md prevalece.

---

## ROLE

Você é um UI/UX engineer especializado em interfaces desktop premium,
motion design e sistemas de interação.

Você está trabalhando em um aplicativo desktop existente construído com:

- HTML
- CSS
- JavaScript
- Go
- Wails

Seu trabalho NÃO é recriar o aplicativo do zero.

Seu trabalho é evoluir a interface existente para um sistema visual
minimalista, consistente, eficiente e inspirado nos princípios de design
e motion do macOS.

---

## OBJETIVO

Transformar a interface existente em uma experiência desktop:

- minimalista
- extremamente clara
- rápida
- previsível
- elegante
- espacial
- responsiva
- com hierarquia visual forte
- com animações precisas e discretas

A referência principal é a linguagem de interação do macOS.

NÃO copie literalmente o macOS.

Extraia seus princípios.

O resultado deve parecer um aplicativo próprio e profissional,
não um clone do macOS.

---

## REGRA PRINCIPAL

PRIORIDADE:

1. Usabilidade
2. Clareza
3. Hierarquia
4. Performance
5. Consistência
6. Motion
7. Decoração

Nunca sacrifique os itens superiores pelos inferiores.

Uma animação que prejudica produtividade deve ser removida.

Uma sombra que não melhora hierarquia deve ser removida.

Uma borda que não comunica estrutura deve ser removida.

Um efeito visual que existe apenas para "parecer bonito" deve ser
questionado.

### Regra específica do ModelField

**"Motion must describe causality."**

```text
cliquei em algo
        ↓
algo muda
        ↓
a mudança deve parecer causada pelo clique
```

Isso é mais importante do que simplesmente colocar `transition: all`.

Exemplo:

```text
Run button
      ↓
  execution starts
      ↓
  execution panel expands from that region
      ↓
  content enters
      ↓
  status becomes active
```

Isso cria **continuidade espacial**. O painel não deveria simplesmente
surgir com `opacity: 0 → 1` quando existe relação espacial com a origem.

Meta: **ModelField = sua identidade + princípios de interação do macOS.**

---

## NÃO REESCREVA O PROJETO

Antes de modificar qualquer código:

1. Examine a estrutura atual.
2. Identifique os componentes existentes.
3. Identifique o sistema de layout.
4. Identifique o sistema de estilos.
5. Identifique os estados da interface.
6. Identifique os eventos existentes.
7. Identifique a comunicação JavaScript ↔ Go/Wails.
8. Identifique componentes que já possuem comportamento correto.
9. Preserve a arquitetura existente sempre que possível.

NÃO:

- recrie o projeto
- migre para React
- introduza frameworks desnecessários
- altere a arquitetura backend
- substitua Wails
- reescreva funcionalidades existentes sem necessidade
- crie abstrações gigantes apenas para estilização

A implementação deve ser incremental.

---

## DESIGN PHILOSOPHY

O design deve seguir:

"less interface, more hierarchy"

A interface deve parecer composta por poucas superfícies,
mas cada superfície deve ter uma função clara.

Evite:

- excesso de cards
- excesso de bordas
- excesso de sombras
- gradientes decorativos
- glassmorphism exagerado
- neon
- glow
- blur excessivo
- elementos flutuando sem propósito
- enormes headings desnecessários
- ícones decorativos
- pills em tudo
- cantos arredondados excessivamente grandes
- visual típico de "AI-generated SaaS"

O objetivo é:

CALMO · PRECISO · ESPACIAL · FUNCIONAL

---

## REFERÊNCIA MACOS

Use o macOS como referência principalmente para:

- hierarquia
- espaçamento
- superfícies
- profundidade
- menus
- sheets
- modais
- popovers
- tooltips
- controles
- feedback
- estados
- transições
- origem espacial das animações

Não copie:

- ícones proprietários
- branding Apple
- elementos visuais específicos
- janelas exatamente iguais
- Finder
- Dock
- System Settings
- qualquer identidade visual proprietária

A referência deve ser conceitual.

---

## DESIGN SYSTEM

Refine o design system baseado no projeto existente.
Tokens vivem em `frontend/css/tokens.css` (fonte única).

Defina tokens para:

- background
- surface
- elevated surface
- text primary / secondary / tertiary
- separator
- accent
- destructive
- success
- warning
- radius
- spacing
- typography
- shadows
- blur
- motion

Não espalhe valores arbitrários pelo CSS.

Prefira:

CSS variables.

Exemplo conceitual:

```css
--background
--surface
--surface-elevated
--text-primary
--text-secondary
--separator
--accent
--radius-sm
--radius-md
--radius-lg
--motion-fast
--motion-normal
--motion-spring
```

Adapte os nomes aos tokens já existentes no projeto.

---

## TIPOGRAFIA

A tipografia deve parecer nativa de desktop moderno.

Priorize:

- SF Pro quando disponível
- system-ui
- -apple-system
- BlinkMacSystemFont

Não introduza fontes externas apenas para criar aparência.

Hierarquia clara:

Display · Heading · Body · Caption · Metadata

Evite títulos gigantes onde eles não possuem função.

---

## ESPAÇAMENTO

O layout deve respirar.

Use uma escala consistente.

Evite:

- elementos colados
- padding inconsistente
- margens arbitrárias
- grids excessivamente fragmentados

A interface deve parecer que os elementos possuem espaço físico.

---

## SUPERFÍCIES

Cada superfície deve possuir uma razão.

Use aproximadamente:

1. Background
2. Primary surface
3. Elevated surface
4. Overlay

Evite criar uma nova superfície para cada componente.

Cards devem ser usados somente quando ajudam a agrupar informação.
Nem tudo precisa estar dentro de um card.

---

## BORDERS

Bordas são secundárias.

Use-as principalmente para:

- separar superfícies
- definir campos
- indicar limites
- aumentar contraste

Não contorne todos os elementos.

Quando possível, use:

contraste + espaçamento + hierarquia

em vez de:

border + shadow + background

---

## SHADOWS

Sombras devem comunicar profundidade.

Use poucas camadas:

```text
Background
↓
Surface
↓
Elevated surface
↓
Popover
↓
Modal
```

Quanto mais próximo do usuário:

- maior a elevação
- maior a suavidade
- maior a separação

Não use sombras pesadas.

---

## BORDER RADIUS

Arredondamento consistente:

- Pequenos controles: radius pequeno
- Inputs: radius médio
- Cards: radius médio/grande
- Modais: radius grande

Não use border-radius extremo indiscriminadamente.

---

## MOTION SYSTEM

Esta é uma das partes mais importantes.

Não adicione "animações" aleatoriamente.

Crie uma linguagem de movimento.

Cada transição deve responder a:

1. De onde o elemento veio?
2. Para onde ele está indo?
3. Qual é sua origem?
4. Qual é sua importância?
5. Ele está entrando, saindo ou mudando de estado?
6. Qual objeto deve parecer estar causando a mudança?

---

## PRINCÍPIO DE CONTINUIDADE ESPACIAL

Um elemento não deve simplesmente:

`opacity: 0 → 1`

quando existir uma relação espacial.

Prefira combinar: opacity + scale + translate.

Exemplo (modal):

```text
scale(.94) translateY(8px) opacity(0)
→
scale(1) translateY(0) opacity(1)
```

A animação deve fazer parecer que o elemento realmente apareceu
naquele espaço.

---

## SPRING

Priorize curvas com sensação de spring:

- `cubic-bezier(.16, 1, .3, 1)`
- `cubic-bezier(.34, 1.56, .64, 1)`

Mas NÃO use bounce excessivo.

A sensação desejada é: rápido, preciso, natural — e não elástico ou infantil.

---

## HIERARQUIA DE VELOCIDADE

| Interação            | Duração      |
| -------------------- | ------------ |
| Pequenas interações  | ~120–220ms   |
| Interações normais   | ~200–350ms   |
| Superfícies          | ~350–600ms   |
| Grandes transições   | ~500–800ms   |

Esses valores são referências.
A sensação final importa mais que números rígidos.

---

## MICROINTERAÇÕES

Todos os controles importantes devem possuir estados:

idle · hover · active · focus · disabled · loading · success · error

Mas NÃO anime tudo.

- Hover: quase imperceptível
- Active: comunica pressão
- Focus: comunica localização
- Loading: comunica atividade
- Success: comunica conclusão

---

## BUTTONS

Estados obrigatórios: idle, hover, active, disabled, loading.

- Hover: pequena alteração de superfície.
- Active: pequena redução de escala (`scale(.96)`).

Não use `scale(.85)` — parece quebrado.

---

## CHECKBOX

Transição curta.

- Unchecked: empty
- Checked: background + checkmark (opacity + scale)

Evite animação longa.

---

## TOGGLE

O knob deve se deslocar espacialmente via `transform: translateX(...)`
com curva spring — não apenas alterar `background-color`.

---

## MENUS

Menus e popovers devem nascer da sua origem.

```text
opacity + scale(.96) + translateY(-4px)
→
opacity + scale(1) + translateY(0)
```

O transform-origin deve corresponder ao ponto de abertura.

---

## CONTEXT MENUS

Devem aparecer próximos ao cursor.

Animação originando daquele ponto:
scale + opacity + small translation.

Pouca profundidade visual.

---

## TOOLTIP

- pequeno, rápido, discreto
- Entrada: opacity + translateY + scale
- Saída: mais rápida que entrada
- Pequeno delay antes de exibir

---

## MODALS

Composição:

- backdrop
- blur moderado quando necessário
- scale + translate + opacity
- shadow

O backdrop aparece suavemente; a superfície ligeiramente depois.
Sequência: background → surface, não tudo simultâneo.

---

## SHEETS

Bottom sheets nascem fora da viewport:

```text
translateY(100%) → translateY(0)
```

Use spring. A superfície deve parecer fisicamente conectada
à parte inferior da janela.

---

## NOTIFICATIONS

Entram lateralmente:

```text
translateX(100%) + scale(.96) + opacity(0)
→
translateX(0) + scale(1) + opacity(1)
```

Saída mais rápida. Não bloqueiam a interface.

---

## SEARCH / COMMAND PALETTE

Search deve parecer uma ferramenta central do aplicativo.

Ao receber foco:

- aumentar levemente
- elevar
- ganhar contraste
- manter a posição espacial

Command palette:

backdrop + blur + scale + translateY

A interface deve parecer suspensa sobre o aplicativo.

---

## WINDOW / PANELS

Painéis não devem simplesmente desaparecer.

Ao abrir: scale + opacity + translate.
Ao fechar: inverso, direção coerente.

---

## LOADING

Loading não deve bloquear a interface sem necessidade.

Use: progress · spinner · skeleton · subtle pulse.

Evite skeletons em excesso.

---

## FEEDBACK

```text
User click
↓
visual acknowledgement
↓
state change
↓
secondary feedback
```

O usuário nunca deve ficar sem saber se a ação foi registrada.

---

## PERFORMANCE

Priorize animações de: **transform** e **opacity**.

Evite animar constantemente: width, height, top, left, margin, padding
quando transform puder resolver.

- Não criar loops JavaScript desnecessários.
- Não adicionar bibliotecas de animação se CSS resolver.

---

## REDUCED MOTION

Respeite `prefers-reduced-motion`.

Para usuários que preferem menos movimento, reduza ou remova:

- scale
- translate
- blur
- grandes transições

Mantendo feedback funcional.

---

## DESKTOP FIRST

Este é um aplicativo desktop Wails.

Priorize: mouse, teclado, shortcuts, hover, right click, focus,
command palette.

Não transforme a interface em um website mobile.
Responsividade continua necessária, mas desktop é a plataforma principal.

---

## KEYBOARD

Sempre que fizer sentido:

Enter · Escape · Cmd/Ctrl + K · Cmd/Ctrl + F · Arrow keys · Tab · Shift + Tab

devem possuir comportamento previsível.

Focus state deve ser visualmente claro.

---

## WAILS

Não quebrar a comunicação:

```text
JavaScript
↕
Wails
↕
Go
```

As animações acontecem no frontend sempre que possível.
Nunca faça uma chamada Go apenas para executar uma animação visual.

Go: filesystem, processos, agentes, modelos, operações pesadas, lógica.
HTML/CSS/JS: visual, interação, estados de UI, motion.

---

## COMPONENTIZAÇÃO

Mesmo em HTML/CSS/JS puro, mantenha arquitetura visual consistente.

Evite duplicação de estilos. Se houver vários buttons/modals/menus/
inputs/notifications, eles devem compartilhar padrões.

Não criar 10 versões quase iguais do mesmo componente.

---

## ESTADOS

Cada componente deve possuir estados explícitos:

`.is-open` `.is-active` `.is-loading` `.is-disabled` `.is-selected` `.is-error`

Evite controlar tudo através de estilos inline espalhados pelo código.

---

## MOTION TOKENS

Tokens de motion (em `tokens.css`):

```css
--duration-fast
--duration-normal
--duration-slow

--ease-standard
--ease-spring
--ease-spring-soft
```

Isso garante linguagem de movimento consistente.

---

## O QUE EVITAR

NÃO fazer:

- glassmorphism excessivo
- blur em todos os elementos
- animações constantes
- parallax
- partículas
- gradients decorativos
- neon
- glow
- bouncing buttons
- cards em excesso
- bordas em excesso
- sombras em excesso
- animações longas para ações simples
- efeitos "AI SaaS"
- dashboard genérico
- visual Dribbble sem função
- copiar Apple literalmente

Se um efeito não melhorar compreensão, feedback ou hierarquia,
provavelmente ele não deveria existir.

---

## PROCESSO DE IMPLEMENTAÇÃO

### FASE 1 — AUDIT

Antes de escrever código, analise o projeto existente.

Mapeie: layout, componentes, estados, eventos, estilos, páginas,
modais, menus, inputs, comunicação Wails.

Produza um mapa da interface. Não faça mudanças ainda.

### FASE 2 — DESIGN SYSTEM

Crie/refatore tokens, typography, spacing, surfaces, radii, shadows,
motion. Sem alterar funcionalidades.

### FASE 3 — COMPONENTES

Aplique a nova linguagem aos componentes existentes:

buttons · inputs · checkboxes · toggles · menus · dropdowns · tooltips ·
modals · notifications · command palette · panels · tabs · lists ·
loading states

### FASE 4 — TRANSITIONS

Adicione motion somente onde existir mudança de estado.

Para cada animação pergunte:
"Qual é a informação que esse movimento comunica?"
Se a resposta for nenhuma: não adicionar.

### FASE 5 — REFINEMENT

Revise: espaçamento, alinhamento, hierarquia, contraste, consistência,
velocidade, curvas, origem das animações, hover, active, focus,
keyboard, performance.

---

## CRITÉRIO DE QUALIDADE

Ao terminar, o aplicativo deve transmitir:

"Eu sei exatamente onde estou."
"Eu sei o que posso fazer."
"Eu sei quando minha ação foi registrada."
"Eu sei de onde essa superfície veio."
"Eu sei para onde ela vai."
"Eu não estou sendo distraído pela interface."

---

## PRINCÍPIO FINAL

Não tente fazer o aplicativo parecer "bonito".

Faça-o parecer **óbvio**.

O design deve desaparecer atrás da funcionalidade.

As animações devem existir para explicar mudanças de estado,
posição e hierarquia.

A interface deve ser minimalista não porque possui poucos elementos,
mas porque cada elemento existente possui uma função clara.

Use o macOS como referência de interação e motion,
não como identidade visual.

Preserve o código existente sempre que possível.

Faça mudanças pequenas, verificáveis e reversíveis.

Não reescreva o projeto sem uma razão técnica concreta.
