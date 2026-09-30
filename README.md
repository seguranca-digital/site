# site
Site simples com comunicação alternativa (CAA)

## Como rodar localmente

```bash
npm install
npm run dev          # servidor de desenvolvimento
npm run test         # testes
npm run build        # gera o site estático em dist/
npm run pictogramas  # baixa os pictogramas do vocabulário inicial (ARASAAC)
```

## Deploy

O app é publicado no **GitHub Pages** pelo workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) a cada push na `main`: ele roda os testes, gera o build e publica a pasta `dist/`.

Passo manual, feito uma única vez no repositório:

**Settings → Pages → Source: GitHub Actions**

O endereço fica `https://<usuário-ou-organização>.github.io/<nome-do-repositório>/`. O workflow passa o nome do repositório em `BASE_PATH`, por isso o app funciona com qualquer nome de repositório.

O app é um PWA: depois do primeiro acesso, pode ser instalado ("Adicionar à tela inicial") e funciona sem internet.
