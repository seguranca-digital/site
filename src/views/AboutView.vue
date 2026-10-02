<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="about">
    <RouterLink to="/" class="btn about__back">
      <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Voltar para a prancha
    </RouterLink>

    <h1 tabindex="-1">Sobre o Comunicador Alternativo</h1>
    <p>
      Comunicador por pictogramas gratuito, de Comunicação Aumentativa e Alternativa (CAA): a pessoa
      monta frases tocando nos cards e o aplicativo fala a frase em voz alta. Desenvolvido com
      co-design na disciplina de Tecnologias Assistivas.
    </p>

    <h2>Créditos</h2>
    <p class="about__credits">
      Os símbolos pictográficos utilizados são propriedade do Governo de Aragão e foram criados por Sergio Palao para a ARASAAC (<a href="https://arasaac.org">https://arasaac.org</a>), que os distribui sob uma licença Creative Commons (BY-NC-SA).
    </p>
  </div>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 48rem;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
  font-size: 1.125rem;
  line-height: 1.6;
}

.about__back {
  align-self: flex-start;
  text-decoration: none;
}

h1 {
  font-size: 1.75rem;
  line-height: 1.25;
}

h2 {
  margin-top: var(--space-2);
  font-size: 1.375rem;
  line-height: 1.3;
}

.about a:not(.btn) {
  color: var(--color-link);
  text-underline-offset: 0.2em;
  overflow-wrap: anywhere;
}
</style>
