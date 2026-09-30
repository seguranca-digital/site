import { describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  parseBackup,
  sanitizeSettings,
  validateBackup,
  validateBoard,
} from '../src/backup'
import { createInitialBoard } from '../src/stores/boardStore'
import { createDefaultSettings } from '../src/stores/settingsStore'

function validBackup() {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: '2026-09-29T12:00:00.000Z',
    board: createInitialBoard(),
    images: { 'foto:1': 'data:image/jpeg;base64,AAAA' },
    settings: createDefaultSettings(),
  }
}

function expectError(result: ReturnType<typeof validateBackup>, fragment: string) {
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toContain(fragment)
}

describe('validação de importação de backup', () => {
  it('aceita um backup válido', () => {
    const result = parseBackup(JSON.stringify(validBackup()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.board.categories).toHaveLength(7)
      expect(result.value.images['foto:1']).toMatch(/^data:image\//)
    }
  })

  it('recusa texto que não é JSON', () => {
    expectError(parseBackup('{ isto não é json'), 'não é um JSON válido')
  })

  it('recusa JSON que não é backup do app', () => {
    expectError(validateBackup({ hello: 'world' }), 'não é um backup')
    expectError(validateBackup([]), 'não é um backup')
    expectError(validateBackup(null), 'não é um backup')
    expectError(validateBackup({ ...validBackup(), format: 'outro-app' }), 'não é um backup')
  })

  it('recusa backup de versão mais nova, pedindo para atualizar o app', () => {
    expectError(validateBackup({ ...validBackup(), version: 2 }), 'versão mais nova')
  })

  it('recusa versão desconhecida ou ausente', () => {
    expectError(validateBackup({ ...validBackup(), version: 0 }), 'não suportada')
    expectError(validateBackup({ ...validBackup(), version: '1' }), 'versão mais nova')
  })

  it('recusa prancha que usa um card inexistente', () => {
    const backup = validBackup()
    backup.board.quickPhraseIds.push('nao-existe')
    expectError(validateBackup(backup), 'o card "nao-existe" é usado mas não existe')
  })

  it('recusa card com classe de palavra inválida', () => {
    const backup = validBackup()
    ;(backup.board.cards.eu as { wordClass: string }).wordClass = 'verbo'
    expectError(validateBackup(backup), 'classe de palavra do card "eu"')
  })

  it('recusa card sem texto ou com id diferente da chave', () => {
    const semTexto = validBackup()
    semTexto.board.cards.eu!.label = '   '
    expectError(validateBackup(semTexto), 'o card "eu" está sem texto')

    const idErrado = validBackup()
    idErrado.board.cards.eu!.id = 'outro'
    expectError(validateBackup(idErrado), 'id diferente da chave')
  })

  it('recusa imagem de card inválida', () => {
    const backup = validBackup()
    backup.board.cards.eu!.picto = { kind: 'custom', blobKey: '' }
    expectError(validateBackup(backup), 'a imagem do card "eu" é inválida')
  })

  it('recusa categoria repetida ou sem nome', () => {
    const repetida = validBackup()
    repetida.board.categories.push(structuredClone(repetida.board.categories[0]!))
    expectError(validateBackup(repetida), 'a categoria "pessoas" está repetida')

    const semNome = validBackup()
    semNome.board.categories[0]!.name = ''
    expectError(validateBackup(semNome), 'a categoria "pessoas" está sem nome')
  })

  it('recusa imagens que não são data URL de imagem', () => {
    expectError(
      validateBackup({ ...validBackup(), images: { 'foto:1': 'https://exemplo.com/a.png' } }),
      'a imagem "foto:1" é inválida',
    )
    expectError(validateBackup({ ...validBackup(), images: [] }), 'lista de imagens inválida')
  })

  it('aproveita só as configurações válidas e completa o resto com o padrão', () => {
    const settings = sanitizeSettings({
      rate: 1.4,
      voiceURI: 'voz-x',
      theme: 'roxo',
      scanning: { intervalMs: 'rápido', enabled: true, mode: 'dois-botoes' },
      campoDesconhecido: 1,
    })
    expect(settings.rate).toBe(1.4)
    expect(settings.voiceURI).toBe('voz-x')
    expect(settings.theme).toBe('claro')
    expect(settings.scanning.intervalMs).toBe(1500)
    expect(settings.scanning.enabled).toBe(true)
    expect(settings.scanning.mode).toBe('dois-botoes')
    expect(settings).not.toHaveProperty('campoDesconhecido')
  })

  it('backup sem configurações usa as padrão', () => {
    const { settings, ...semConfiguracoes } = validBackup()
    void settings
    const result = validateBackup(semConfiguracoes)
    expect(result.ok && result.value.settings).toEqual(createDefaultSettings())
  })
})

describe('validateBoard', () => {
  it('aceita o vocabulário inicial', () => {
    expect(validateBoard(createInitialBoard()).ok).toBe(true)
  })

  it('recusa versão diferente de 1', () => {
    expect(validateBoard({ ...createInitialBoard(), version: 2 }).ok).toBe(false)
  })
})
