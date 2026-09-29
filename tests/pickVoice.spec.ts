import { describe, expect, it } from 'vitest'
import { pickVoice } from '../src/composables/useSpeech'

function makeVoice(voiceURI: string, lang: string, localService = false): SpeechSynthesisVoice {
  return { voiceURI, name: voiceURI, lang, localService, default: false }
}

describe('pickVoice', () => {
  const ptPT = makeVoice('pt-pt', 'pt-PT')
  const ptBROnline = makeVoice('pt-br-online', 'pt-BR')
  const ptBRLocal = makeVoice('pt-br-local', 'pt-BR', true)
  const en = makeVoice('en', 'en-US', true)

  it('usa a voz configurada, se existir', () => {
    expect(pickVoice([ptBRLocal, en], 'en')).toBe(en)
  })

  it('ignora a voz configurada que não existe mais', () => {
    expect(pickVoice([en, ptBRLocal], 'sumiu')).toBe(ptBRLocal)
  })

  it('prefere pt-BR local (offline) a pt-BR online', () => {
    expect(pickVoice([ptBROnline, ptBRLocal], null)).toBe(ptBRLocal)
  })

  it('usa qualquer pt-BR se não houver local', () => {
    expect(pickVoice([en, ptPT, ptBROnline], null)).toBe(ptBROnline)
  })

  it('aceita o formato pt_BR usado por alguns Androids', () => {
    const android = makeVoice('android', 'pt_BR', true)
    expect(pickVoice([ptPT, android], null)).toBe(android)
  })

  it('usa qualquer português se não houver pt-BR', () => {
    expect(pickVoice([en, ptPT], null)).toBe(ptPT)
  })

  it('devolve null (voz padrão) se não houver português', () => {
    expect(pickVoice([en], null)).toBeNull()
    expect(pickVoice([], null)).toBeNull()
  })
})
