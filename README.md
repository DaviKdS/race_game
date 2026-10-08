# Street Rush 3D

Protótipo jogável de corrida arcade 3D em cidade noturna, inspirado por perseguições urbanas clássicas sem usar marcas, carros licenciados ou mapas existentes.

## Como executar

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:5173/`.

## Publicacao web

O projeto inclui GitHub Actions para publicar automaticamente no GitHub Pages quando houver push na branch `main`.

URL esperada apos a primeira execucao do workflow:

`https://davikds.github.io/race_game/`

## Instalador Windows

O instalador pronto fica em:

`release/StreetRushInstaller.exe`

Ao executar, ele instala o jogo em `%USERPROFILE%\Street Rush`, inicia `StreetRush.exe`, sobe um servidor local e abre o jogo no navegador.

Para recriar o instalador:

```bash
npm run package:win
```

## Controles

- `W` / `Seta para cima`: acelerar
- `S` / `Seta para baixo`: frear
- `A` / `D`: virar
- `Shift`: nitro
- `Espaço`: drift / freio de mão
- `R`: reiniciar / reposicionar
- `C`: alternar câmera
- `Esc`: pausar

## Funcionalidades implementadas

- Cena 3D em Three.js com cidade noturna procedural, prédios, neon, pista, tráfego e iluminação.
- Carro controlável com aceleração, frenagem, curva arcade, nitro, drift e colisão.
- Câmera em terceira pessoa com FOV dinâmico e modo alternativo.
- Tráfego urbano e perseguição policial com nível de procurado.
- HUD com velocímetro, marcha, pontuação, nitro, procurado e minimapa simples.

## Nota sobre Unity

O escopo anexado pede Unity 6, C#, URP e Rigidbody. Neste ambiente foi encontrado apenas o Unity Hub, sem instalação detectável de um editor Unity em `C:\Program Files\Unity\Hub\Editor` ou comando `Unity` disponível. Por isso, esta entrega foi feita como protótipo web executável e validável localmente.

Para migrar para Unity, instale um editor Unity 6 ou compatível pelo Unity Hub e recrie a Fase 1 com a estrutura `Assets/Scripts/{Core,Vehicle,Camera,UI}`.
