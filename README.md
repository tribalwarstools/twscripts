
---

# Gerenciador de Envio de Tropas - Versão 2.0

## Descrição

Este projeto consiste em um script para o jogo **Tribal Wars** que facilita o gerenciamento e envio de tropas para múltiplas coordenadas de aldeias. A versão 2.0 traz melhorias na interface e funcionalidades para tornar o processo mais rápido e intuitivo para o jogador.

## Funcionalidades Principais

* **Seleção de coordenadas** por jogador ou tribo com preenchimento automático usando dados do mundo do jogo (`village.txt`, `player.txt` e `ally.txt`).
* **Entrada manual e colagem** de coordenadas via área de transferência.
* **Configuração personalizada da quantidade de tropas** para envio, com interface clara e inputs numéricos para cada tipo de unidade.
* **Salvar e carregar** as coordenadas e configurações de tropas localmente no navegador, facilitando reutilização.
* **Pré-visualização** dos dados inseridos, mostrando quantas coordenadas foram inseridas e as tropas configuradas.
* **Botão para criar atalho na Quickbar do jogo** para execução rápida do script de ataque.
* Mensagens claras de informação, sucesso e erro usando a interface padrão do jogo.

## Tecnologias Utilizadas

* JavaScript puro com uso da API Fetch para carregar dados do mundo.
* Manipulação do DOM para criar interface interativa.
* Uso de LocalStorage para salvar dados entre sessões.
* Uso de jQuery para requisição AJAX ao criar atalhos.
* Integração com o sistema de mensagens do Tribal Wars para feedback visual.

## Como Usar

1. Execute o script no console do navegador ou instale como userscript.
2. O painel de gerenciamento será exibido automaticamente.
3. Escolha jogador ou tribo para preencher as coordenadas automaticamente, ou cole/insira manualmente.
4. Configure a quantidade de tropas para envio.
5. Use os botões para salvar, limpar, mostrar preview ou criar atalho.
6. O atalho criado fica disponível na Quickbar do jogo para execução rápida do script de ataque.

## Benefícios

* Agiliza o processo de envio de tropas.
* Evita erros manuais de digitação de coordenadas e tropas.
* Permite planejamento e visualização antecipada antes do envio.
* Melhora a experiência do usuário no jogo.

## Observações

* O script depende da disponibilidade dos arquivos públicos do mundo (`village.txt`, etc).
* O botão "Criar Atalho" exige que o token CSRF esteja disponível para funcionar.
* Foi testado no navegador Chrome e Firefox nas versões recentes.

---

