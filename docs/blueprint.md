# **App Name**: Rappi Commander

## Core Features:

- Navegação e Menu Principal do Aplicativo: Uma tela inicial com um menu principal que inclui opções para 'Envio de Pedido', 'Solicitação de Pedido', 'Pedidos Ativos', 'Seção de Cadastros' (com 'Cadastro de Usuários' e 'Cadastro de Entregadores') e um botão 'Sair'.
- Autenticação de Usuários e Entregadores: Funcionalidades seguras de login para usuários e entregadores usando Firebase Authentication, incluindo recuperação de senha e logout. A tela de login inicial será minimalista, sem opção direta de registro de novos usuários.
- Gerenciamento de Usuários (Acesso Master): Dentro da 'Seção de Cadastros', a funcionalidade de 'Cadastro de Usuários' será exclusivamente acessível e operável por usuários com perfil 'master', permitindo o registro de novos usuários com Nome, Email, Senha e a definição do perfil (usuário normal ou master).
- Cadastro de Entregadores: Dentro da 'Seção de Cadastros', a funcionalidade de 'Cadastro de Entregadores' permitirá o registro de novos entregadores no sistema, coletando apenas Nome e ID para simplificar o processo.
- Criação e Envio de Pedidos: A tela principal do sistema para criar e enviar novos pedidos, especificando detalhes de coleta, entrega, itens e instruções especiais. Esta funcionalidade também estará acessível via um botão de acesso rápido no topo.
- Aceitação e Solicitação de Pedidos (Entregadores): Entregadores podem visualizar pedidos disponíveis, revisar detalhes e aceitar atribuições. Esta funcionalidade também estará acessível via um botão de acesso rápido no topo.
- Monitoramento de Pedidos Ativos: Exibição de um painel de pedidos ativos e pendentes, mostrando seu status atual, entregador atribuído e detalhes importantes.
- Ferramenta de Refinamento de Detalhes de Pedido com IA: Utiliza inteligência artificial generativa como 'ferramenta' para analisar e sugerir categorizações ou extrair detalhes chave (ex: tipos de itens, endereços) de descrições de pedidos em texto livre, agilizando a entrada de dados.
- Integração com Firebase Firestore: Armazenamento persistente de todos os dados de usuários, pedidos, status e perfis de entregadores no Firebase Firestore, garantindo sincronização em tempo real.
- Interface de Usuário Multiplataforma: O aplicativo será desenvolvido como um PWA (Progressive Web App) responsivo e um APK nativo para Android usando Kotlin com Jetpack Compose, proporcionando uma experiência otimizada em diversos tamanhos de tela.
- Alternância de Tema (Modo Claro/Escuro): Permite ao usuário alternar entre o modo de interface claro e escuro, adaptando as cores do aplicativo para diferentes preferências e ambientes.

## Style Guidelines:

- Esquema de cores: Suporte completo para modos claro e escuro, visando profissionalismo, clareza e conforto visual. O usuário poderá alternar entre os temas.
- Cor primária: Um laranja-vermelho vibrante e refinado (#E65C1A), usado para elementos interativos chave e marca, visível em ambos os modos.
- Cor de destaque: Um rosa-profundo (#DB7296), utilizado para ações secundárias e notificações, harmonioso em ambos os modos.
- Cor de fundo (Modo Claro): Um laranja-vermelho muito claro, quase branco e sutil (#FAF4F2), proporcionando uma tela limpa e discreta para o modo claro.
- Cor de fundo (Modo Escuro): Um azul escuro profundo (#1A2B3C), escolhido para oferecer um contraste elegante e reduzir a fadiga ocular, ideal para o modo escuro.
- Cores de Texto: Em modo claro, texto escuro sobre fundo claro. Em modo escuro, texto claro (como branco suave ou cinza claro) sobre fundo escuro para máxima legibilidade.
- Detalhe de Marca: O nome do aplicativo 'Rappi Commander' e elementos de marca chave devem utilizar a cor primária laranja-avermelhada (#E65C1A) para consistência visual em ambos os modos.
- Fonte para corpo e títulos: 'Inter' (sans-serif). Escolhida por sua aparência moderna, limpa e objetiva, garantindo excelente legibilidade e um senso de clareza vital para um aplicativo de comando e controle.
- Utilizar um conjunto consistente de ícones limpos e baseados em linha que representem visualmente logística, despacho, usuários e vários status de pedidos, melhorando a clareza e a navegação do usuário.
- Implementar um layout de dashboard claro e modular com seções distintas para envio de pedidos, pedidos ativos e registros. Incluir dois botões de acesso rápido no topo para 'Envio de Pedido' e 'Solicitação de Pedido'. A tela de 'Envio de Pedido' será a tela principal do sistema. Telas de entrada, como a de login, devem adotar um design minimalista e limpo, focando na funcionalidade essencial. Para a versão web, o layout não deve ocupar a tela inteira, mas sim ser centralizado, simulando uma tela de tablet de 10 polegadas.
- Animações sutis e suaves para mudanças de estado (ex: atualizações de status de pedidos), envio de formulários e transições de menu para fornecer feedback instantâneo e melhorar a percepção de responsividade do aplicativo.